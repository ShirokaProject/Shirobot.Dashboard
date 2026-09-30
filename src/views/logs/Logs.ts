import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getLogSources, getLogStreamUrl, type BackendLogLevel, type LogEntry, type LogSourceInfo, type LogStreamMessage } from '../../api'
import { isDemoMode } from '../../auth/session'
import type { LogLevel, RuntimeLog } from '../../features/logs/types'

const maxLogLines = 1000

/** Minimum severity shown: everything, warnings and up, or errors only */
export type LevelFilter = 'ALL' | 'WARN' | 'ERROR'

export const levelOptions: Array<{ value: LevelFilter; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'WARN', label: '警告及以上' },
  { value: 'ERROR', label: '仅错误' }
]

export type StreamState = 'connecting' | 'live' | 'reconnecting' | 'paused'

export const streamStateLabels: Record<StreamState, string> = {
  connecting: '正在连接',
  live: '实时',
  reconnecting: '连接中断，正在重连',
  paused: '已暂停'
}

function parseLogLine(raw: string, id: number): RuntimeLog {
  const match = raw.match(/^\[(?<time>[^\]]+)]\s+\[(?<source>[^\]]+)]\s*(?<message>.*)$/)
  const source = match?.groups?.source || 'system'
  const message = match?.groups?.message || raw

  return {
    id,
    kind: source.toLowerCase() === 'system' ? 'system' : 'plugin',
    level: parseLevel(raw),
    time: match?.groups?.time || '',
    source,
    message,
    raw,
    traceId: '-'
  }
}

function createLogFromEntry(entry: LogEntry, id: number): RuntimeLog {
  const time = formatLogTime(entry.time)

  return {
    id,
    kind: entry.source.toLowerCase() === 'system' ? 'system' : 'plugin',
    level: mapLogLevel(entry.level),
    time,
    source: entry.source,
    message: entry.message,
    raw: `[${time}] [${entry.source}] ${entry.message}`,
    traceId: '-'
  }
}

function formatLogTime(time: string) {
  const match = time.match(/\b(\d{2}:\d{2}:\d{2})\b/)
  return match?.[1] ?? time
}

function mapLogLevel(level: BackendLogLevel): LogLevel {
  const levelMap: Record<BackendLogLevel, LogLevel> = {
    log: 'LOG',
    info: 'INFO',
    warning: 'WARN',
    error: 'ERROR',
    success: 'SUCCESS'
  }

  return levelMap[level] ?? 'INFO'
}

function parseLevel(raw: string): LogLevel {
  if (/\b(error|fail|exception)\b/i.test(raw)) return 'ERROR'
  if (/\b(warn|warning)\b/i.test(raw)) return 'WARN'
  return 'INFO'
}

function matchesLevel(level: LogLevel, filter: LevelFilter) {
  if (filter === 'ERROR') return level === 'ERROR'
  if (filter === 'WARN') return level === 'ERROR' || level === 'WARN'
  return true
}

export function useLogsPage() {
  const keyword = ref('')
  const activeLevel = ref<LevelFilter>('ALL')
  const activeSource = ref('ALL')
  const autoRefresh = ref(true)
  const streamState = ref<StreamState>('connecting')
  const loadError = ref('')

  const runtimeLogs = ref<RuntimeLog[]>([])
  const logSources = ref<LogSourceInfo[]>([])
  const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())
  let socket: WebSocket | null = null
  let stopDemoStream: (() => void) | null = null
  let sourceTimer: ReturnType<typeof window.setInterval> | undefined
  let reconnectTimer: ReturnType<typeof window.setTimeout> | undefined
  let nextLogId = 1
  let disposed = false

  // Everything except the level filter, so the level counts describe what's on screen.
  const scopedLogs = computed(() => runtimeLogs.value.filter(log => {
    const matchSource = activeSource.value === 'ALL' || log.source === activeSource.value
    const matchKeyword = !normalizedKeyword.value || [log.message, log.source]
      .some(value => value.toLowerCase().includes(normalizedKeyword.value))
    return matchSource && matchKeyword
  }))

  const filteredLogs = computed(() => scopedLogs.value.filter(log => matchesLevel(log.level, activeLevel.value)))

  const levelCounts = computed(() => ({
    ALL: scopedLogs.value.length,
    WARN: scopedLogs.value.filter(log => matchesLevel(log.level, 'WARN')).length,
    ERROR: scopedLogs.value.filter(log => log.level === 'ERROR').length
  }))

  const sourceFilters = computed(() => {
    const counts: Record<string, { total: number; errors: number }> = {}
    for (const log of runtimeLogs.value) {
      const entry = counts[log.source] ??= { total: 0, errors: 0 }
      entry.total += 1
      if (log.level === 'ERROR') entry.errors += 1
    }

    // Sources the backend lists, plus any that only show up in the stream
    const known = new Set(logSources.value.map(source => source.source))
    const extra = Object.keys(counts).filter(source => !known.has(source))
    const sourceItems = [
      ...logSources.value.map(source => ({ key: source.source, label: source.plugin_name || source.source, description: source.description })),
      ...extra.map(source => ({ key: source, label: source, description: '' }))
    ].map(item => ({
      ...item,
      count: counts[item.key]?.total ?? 0,
      errors: counts[item.key]?.errors ?? 0
    }))

    return [
      {
        key: 'ALL',
        label: '全部来源',
        description: '主程序、适配器与插件',
        count: runtimeLogs.value.length,
        errors: runtimeLogs.value.filter(log => log.level === 'ERROR').length
      },
      ...sourceItems
    ]
  })

  const activeSourceLabel = computed(() => sourceFilters.value.find(source => source.key === activeSource.value)?.label ?? activeSource.value)

  function appendLogs(entries: Array<LogEntry | string>) {
    const logs = entries.map(entry => typeof entry === 'string'
      ? parseLogLine(entry, nextLogId++)
      : createLogFromEntry(entry, nextLogId++))
    runtimeLogs.value = [...runtimeLogs.value, ...logs].slice(-maxLogLines)
  }

  function handleStreamMessage(message: LogStreamMessage) {
    if (message.type === 'connected') {
      loadError.value = ''
      streamState.value = 'live'
      return
    }

    if (message.type === 'history') {
      nextLogId = 1
      runtimeLogs.value = []
      appendLogs(message.data)
      return
    }

    appendLogs(message.data)
  }

  function closeSocket() {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = undefined
    stopDemoStream?.()
    stopDemoStream = null
    if (socket) {
      socket.onclose = null
      socket.close()
    }
    socket = null
  }

  function connectStream() {
    closeSocket()

    if (!autoRefresh.value) {
      streamState.value = 'paused'
      return
    }

    if (streamState.value !== 'reconnecting') streamState.value = 'connecting'

    // Dev-only demo feed; dynamic so the demo dataset stays out of production builds.
    if ((import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true') && isDemoMode()) {
      void import('../../api/demo').then(({ openDemoLogStream }) => {
        if (!disposed && autoRefresh.value && !stopDemoStream) stopDemoStream = openDemoLogStream(handleStreamMessage)
      })
      return
    }

    socket = new WebSocket(getLogStreamUrl())

    socket.onmessage = event => {
      try {
        handleStreamMessage(JSON.parse(event.data) as LogStreamMessage)
      } catch {
        loadError.value = '日志流返回了无法解析的数据'
      }
    }

    socket.onopen = () => {
      loadError.value = ''
      streamState.value = 'live'
    }

    socket.onclose = () => {
      socket = null
      if (autoRefresh.value) {
        streamState.value = 'reconnecting'
        reconnectTimer = window.setTimeout(connectStream, 2000)
      }
    }

    socket.onerror = () => {
      loadError.value = '无法连接日志流 /api/v1/logs/stream'
    }
  }

  async function refreshSources() {
    try {
      logSources.value = await getLogSources()
    } catch {
      // The stream still works without the source list; sources then come from the lines.
    }
  }

  function refreshLogs() {
    void refreshSources()
    connectStream()
  }

  /** Local only: the backend keeps its own copy */
  function clearLogs() {
    runtimeLogs.value = []
  }

  function exportLogs() {
    const text = filteredLogs.value.map(log => `[${log.time}] [${log.level}] [${log.source}] ${log.message}`).join('\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    link.href = url
    link.download = `shirobot-${activeSource.value === 'ALL' ? 'all' : activeSource.value}-${stamp}.log`
    link.click()
    URL.revokeObjectURL(url)
  }

  watch(autoRefresh, enabled => {
    if (enabled) {
      connectStream()
    } else {
      closeSocket()
      streamState.value = 'paused'
    }
  })

  onMounted(() => {
    void refreshSources()
    sourceTimer = window.setInterval(() => void refreshSources(), 5000)
    connectStream()
  })

  onBeforeUnmount(() => {
    disposed = true
    window.clearInterval(sourceTimer)
    closeSocket()
  })

  return {
    keyword,
    normalizedKeyword,
    activeLevel,
    activeSource,
    activeSourceLabel,
    autoRefresh,
    streamState,
    loadError,
    runtimeLogs,
    filteredLogs,
    levelCounts,
    sourceFilters,
    refreshLogs,
    clearLogs,
    exportLogs
  }
}
