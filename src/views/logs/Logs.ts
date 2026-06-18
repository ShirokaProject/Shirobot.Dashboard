import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getLogSources, getLogStreamUrl, type BackendLogLevel, type LogEntry, type LogSourceInfo, type LogStreamMessage } from '../../api'
import type { KindFilter, LogLevel, RuntimeLog } from '../../features/logs/types'
import { kindOptions } from '../../features/logs/utils'

const maxLogLines = 1000

function parseLogLine(raw: string, id: number): RuntimeLog {
  const match = raw.match(/^\[(?<time>[^\]]+)]\s+\[(?<source>[^\]]+)]\s*(?<message>.*)$/)
  const source = match?.groups?.source || 'system'
  const message = match?.groups?.message || raw
  const level = parseLevel(raw)

  return {
    id,
    kind: source.toLowerCase() === 'system' ? 'system' : 'plugin',
    level,
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
    raw: `[${time}] ${entry.message}`,
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

  return levelMap[level]
}

function parseLevel(raw: string): LogLevel {
  if (/\b(error|fail|exception)\b/i.test(raw)) return 'ERROR'
  if (/\b(warn|warning)\b/i.test(raw)) return 'WARN'
  return 'INFO'
}

function shortSource(source: string) {
  if (source === 'ALL') return '*'
  return source.slice(0, 2).toUpperCase()
}

export function useLogsPage() {
  const keyword = ref('')
  const activeKind = ref<KindFilter>('ALL')
  const activeSource = ref('ALL')
  const autoRefresh = ref(true)
  const loadError = ref('')

  const runtimeLogs = ref<RuntimeLog[]>([])
  const logSources = ref<LogSourceInfo[]>([])
  const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())
  const activeLogFileName = computed(() => `${activeSource.value === 'ALL' ? 'all' : activeSource.value}.log`)
  let socket: WebSocket | null = null
  let sourceTimer: ReturnType<typeof window.setInterval> | undefined
  let reconnectTimer: ReturnType<typeof window.setTimeout> | undefined
  let nextLogId = 1

  const filteredLogs = computed(() => {
    return runtimeLogs.value.filter(log => {
      const matchKind = activeKind.value === 'ALL' || log.kind === activeKind.value
      const matchSource = activeSource.value === 'ALL' || log.source === activeSource.value
      const matchKeyword = !normalizedKeyword.value || [log.raw, log.message, log.source, log.traceId, log.groupName ?? '', log.groupId ?? '', log.userId ?? '']
        .some(value => value.toLowerCase().includes(normalizedKeyword.value))
      return matchKind && matchSource && matchKeyword
    })
  })

  const sourceFilters = computed(() => {
    const counts = runtimeLogs.value.reduce<Record<string, number>>((result, log) => {
      result[log.source] = (result[log.source] ?? 0) + 1
      return result
    }, {})

    const sourceItems = logSources.value.map(source => ({
      key: source.source,
      label: source.plugin_name || source.source,
      short: shortSource(source.source),
      description: source.description,
      count: counts[source.source] ?? 0
    }))

    return [
      {
        key: 'ALL',
        label: '全部来源',
        short: '*',
        description: '消息、插件、系统输出',
        count: runtimeLogs.value.length
      },
      ...sourceItems
    ]
  })

  function setKind(kind: KindFilter) {
    activeKind.value = kind
  }

  function appendLogs(entries: Array<LogEntry | string>) {
    const logs = entries.map(entry => typeof entry === 'string'
      ? parseLogLine(entry, nextLogId++)
      : createLogFromEntry(entry, nextLogId++))
    runtimeLogs.value = [...runtimeLogs.value, ...logs].slice(-maxLogLines)
  }

  function handleStreamMessage(message: LogStreamMessage) {
    if (message.type === 'connected') {
      loadError.value = ''
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
    if (socket) {
      socket.onclose = null
      socket.close()
    }
    socket = null
  }

  function connectStream() {
    closeSocket()

    if (!autoRefresh.value) return

    socket = new WebSocket(getLogStreamUrl())

    socket.onmessage = event => {
      try {
        handleStreamMessage(JSON.parse(event.data) as LogStreamMessage)
      } catch (error) {
        loadError.value = '日志流返回了无法解析的数据。'
        void error
      }
    }

    socket.onopen = () => {
      loadError.value = ''
    }

    socket.onclose = () => {
      socket = null
      if (autoRefresh.value) {
        reconnectTimer = window.setTimeout(connectStream, 2000)
      }
    }

    socket.onerror = () => {
      loadError.value = '日志 WebSocket 暂不可用，请接入 /api/v1/logs/stream 后刷新。'
    }
  }

  async function refreshSources() {
    loadError.value = ''
    try {
      logSources.value = await getLogSources()
    } catch (error) {
      loadError.value = '后端日志来源接口暂不可用，请接入 /api/v1/logs/sources 后刷新。'
      void error
    }
  }

  function refreshLogs() {
    void refreshSources()
    connectStream()
  }

  watch(autoRefresh, enabled => {
    if (enabled) {
      connectStream()
    } else {
      closeSocket()
    }
  })

  onMounted(() => {
    void refreshSources()
    sourceTimer = window.setInterval(() => void refreshSources(), 5000)
    connectStream()
  })

  onBeforeUnmount(() => {
    window.clearInterval(sourceTimer)
    closeSocket()
  })

  return {
    keyword,
    activeKind,
    activeSource,
    activeLogFileName,
    autoRefresh,
    loadError,
    filteredLogs,
    sourceFilters,
    kindOptions,
    setKind,
    refreshLogs
  }
}
