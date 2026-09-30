import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ApiError,
  getAdapters,
  getApiErrorMessage,
  getInstalledPlugins,
  getOverview,
  getRuntimeLogs,
  requestHostPower,
  startAdapter,
  stopAdapterById,
  type AdapterStatus,
  type HostPowerAction,
  type OverviewLatestError,
  type OverviewResponse
} from '../../api'
import type { LogLevel, RuntimeLog } from '../../features/logs/types'
import type { Plugin } from '../../features/plugins/types'
import { faceFor, greetingFor } from '../../features/overview/greeting'
import { getDashboardSession, getSessionModeLabel } from '../../auth/session'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** Turn a failed panel load into calm copy; a 404 just means this backend lacks the endpoint. */
function describeLoadError(error: unknown, what: string) {
  if (error instanceof ApiError && error.status === 404) return `当前后端还没有提供${what}接口`
  if (error instanceof TypeError) return '暂时无法连接到后端'
  return getApiErrorMessage(error, `${what}读取失败`)
}

export type LogLevelFilter = 'ALL' | 'WARN' | 'ERROR'
export type StatusTone = 'primary' | 'success' | 'warning' | 'error' | 'neutral'

const RECENT_LOG_LIMIT = 8

export const logLevelFilters: Array<{ key: LogLevelFilter; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'WARN', label: '警告' },
  { key: 'ERROR', label: '错误' }
]

const levelTone: Record<LogLevel, StatusTone> = {
  LOG: 'neutral',
  INFO: 'neutral',
  SUCCESS: 'success',
  WARN: 'warning',
  ERROR: 'error'
}

const powerCopy: Record<HostPowerAction, { title: string; message: string; confirm: string; done: string }> = {
  restart: {
    title: '重启 Shirobot',
    message: '重启期间机器人会短暂离线，正在处理的消息可能丢失。',
    confirm: '重启',
    done: '已发送重启指令'
  },
  shutdown: {
    title: '关闭 Shirobot',
    message: '关机后机器人将停止响应，需要在服务器上手动启动才能恢复。',
    confirm: '关机',
    done: '已发送关机指令'
  }
}

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return ''

  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
  return `${Math.max(minutes, 1)} 分钟`
}

export type RuntimeIcon = 'deployed_code' | 'sell' | 'computer' | 'memory' | 'code' | 'calendar_today'

function runModeLabel(mode: string) {
  return { docker: 'Docker', systemd: 'systemd 服务', native: '直接运行', windows_service: 'Windows 服务' }[mode.toLowerCase()] ?? mode
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  return `${Math.round(bytes / 1024 ** 2)} MB`
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function adapterTone(adapter: AdapterStatus): StatusTone {
  if (adapter.error) return 'error'
  if (adapter.restartRequired) return 'warning'
  return adapter.loaded ? 'success' : 'neutral'
}

export function adapterStatusLabel(adapter: AdapterStatus) {
  if (adapter.error) return '异常'
  if (adapter.restartRequired) return '待重启'
  return adapter.loaded ? '运行中' : '已停止'
}

export function logTone(level: LogLevel): StatusTone {
  return levelTone[level] ?? 'neutral'
}

export function useOverviewPage() {
  const overview = ref<OverviewResponse | null>(null)
  const adapters = ref<AdapterStatus[]>([])
  const logs = ref<RuntimeLog[]>([])
  const plugins = ref<Plugin[]>([])
  const loadError = ref('')
  const adaptersError = ref('')
  const pluginsError = ref('')
  const logsError = ref('')
  const levelFilter = ref<LogLevelFilter>('ALL')
  const busyAdapterId = ref('')
  const powerPending = ref<HostPowerAction | null>(null)

  const health = computed(() => {
    const response = overview.value
    if (!response) return { tone: 'neutral' as StatusTone, label: '状态未知' }
    const status = response.health_status || (response.adapter_status === 'disconnected' ? '异常' : '正常')
    return { tone: (status === '正常' ? 'success' : 'error') as StatusTone, label: status === '正常' ? '运行正常' : `运行${status}` }
  })

  const uptime = computed(() => formatDuration(Number(overview.value?.uptime_seconds)))
  const botVersion = computed(() => overview.value?.bot_version || '')
  const latestError = computed<OverviewLatestError | null>(() => {
    const error = overview.value?.latest_error
    return error && (error.source || error.message) ? error : null
  })

  const pluginSummary = computed(() => {
    const list = plugins.value
    const count = (status: Plugin['status']) => list.filter(plugin => plugin.status === status).length
    const segments = [
      { key: 'enabled', label: '启用', tone: 'primary' as StatusTone, count: count('enabled') },
      { key: 'disabled', label: '关闭', tone: 'neutral' as StatusTone, count: count('disabled') },
      { key: 'error', label: '错误', tone: 'error' as StatusTone, count: count('error') }
    ]
    return {
      total: list.length,
      segments,
      errors: list.filter(plugin => plugin.status === 'error'),
      updates: list.filter(plugin => plugin.hasUpdate)
    }
  })

  const onlineAdapterCount = computed(() => adapters.value.filter(adapter => adapter.loaded && !adapter.error).length)

  const visibleLogs = computed(() => {
    const filtered = levelFilter.value === 'ALL'
      ? logs.value
      : logs.value.filter(log => levelFilter.value === 'ERROR' ? log.level === 'ERROR' : log.level === 'WARN' || log.level === 'ERROR')
    return filtered.slice(-RECENT_LOG_LIMIT).reverse()
  })

  const logCounts = computed(() => ({
    ALL: logs.value.length,
    WARN: logs.value.filter(log => log.level === 'WARN' || log.level === 'ERROR').length,
    ERROR: logs.value.filter(log => log.level === 'ERROR').length
  }))

  // Live clock for the greeting card
  const now = ref(new Date())
  let clockTimer: ReturnType<typeof setInterval> | undefined
  const greeting = computed(() => greetingFor(now.value.getHours()))
  const greetingFace = computed(() => faceFor(now.value.getHours()))
  const dateLabel = computed(() => {
    const date = now.value
    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    return `${date.getMonth() + 1} 月 ${date.getDate()} 日 星期${WEEKDAYS[date.getDay()]} · ${time}`
  })

  // Key numbers shown along the bottom of the greeting card
  const heroFacts = computed(() => {
    const response = overview.value
    const summary = pluginSummary.value
    const enabled = summary.segments.find(segment => segment.key === 'enabled')?.count ?? 0
    return [
      { key: 'uptime', label: '已运行', value: uptime.value || '—' },
      { key: 'messages', label: '今日消息', value: response ? String(response.message_count ?? 0) : '—' },
      { key: 'plugins', label: '插件启用', value: summary.total ? `${enabled} / ${summary.total}` : '—' },
      { key: 'adapters', label: '适配器在线', value: adapters.value.length ? `${onlineAdapterCount.value} / ${adapters.value.length}` : '—' },
      { key: 'models', label: '平台 Models', value: response ? String(response.models_count ?? 0) : '—' }
    ]
  })

  const backendLabel = computed(() => getSessionModeLabel(getDashboardSession()))

  // 运行环境 card. Each fact appears only when the backend reports it.
  const runtimeFacts = computed(() => {
    const runtime = overview.value?.runtime
    if (!runtime) return []
    const facts: Array<{ key: string; icon: RuntimeIcon; label: string; value: string; mono?: boolean }> = []
    if (runtime.mode) facts.push({ key: 'mode', icon: 'deployed_code', label: '运行方式', value: runModeLabel(runtime.mode) })
    if (runtime.version_tag) facts.push({ key: 'tag', icon: 'sell', label: '版本 Tag', value: runtime.version_tag, mono: true })
    if (runtime.os) facts.push({ key: 'os', icon: 'computer', label: '系统', value: runtime.os })
    if (runtime.arch) facts.push({ key: 'arch', icon: 'memory', label: '架构', value: runtime.arch, mono: true })
    if (runtime.framework) facts.push({ key: 'framework', icon: 'code', label: '运行时', value: runtime.framework })
    if (runtime.build_time) facts.push({ key: 'build', icon: 'calendar_today', label: runtime.mode === 'docker' ? '镜像构建' : '构建时间', value: formatDateTime(runtime.build_time) })
    return facts
  })

  const memory = computed(() => {
    const runtime = overview.value?.runtime
    if (runtime?.memory_bytes === undefined) return null
    const total = runtime.memory_bytes
    const heap = runtime.gc_heap_bytes
    return {
      total: formatBytes(total),
      heap: heap === undefined ? null : formatBytes(heap),
      // Share of the working set that is managed heap, for the small meter
      heapRatio: heap === undefined || !total ? 0 : Math.min(1, heap / total)
    }
  })

  const bars = computed(() => {
    const buckets = Array.isArray(overview.value?.message_freq) ? overview.value.message_freq : []
    const counts = buckets.map(item => Number(item.count) || 0)
    const maxCount = Math.max(...counts, 0)
    return buckets.map((bucket, index) => ({
      time: bucket.start_time,
      count: counts[index],
      height: maxCount > 0 ? Math.max(6, Math.round((counts[index] / maxCount) * 100)) : 0,
      peak: maxCount > 0 && counts[index] === maxCount
    }))
  })

  const peakBar = computed(() => bars.value.find(bar => bar.peak) ?? null)
  const messageTotal = computed(() => bars.value.reduce((sum, bar) => sum + bar.count, 0))

  async function loadOverview() {
    try {
      overview.value = await getOverview()
      loadError.value = ''
    } catch (error) {
      loadError.value = describeLoadError(error, '概览')
    }
  }

  async function loadAdapters() {
    try {
      adapters.value = await getAdapters()
      adaptersError.value = ''
    } catch (error) {
      adaptersError.value = describeLoadError(error, '适配器')
    }
  }

  async function loadLogs() {
    try {
      logs.value = (await getRuntimeLogs({ limit: 50 })).logs ?? []
      logsError.value = ''
    } catch (error) {
      logsError.value = describeLoadError(error, '运行日志')
    }
  }

  async function loadPlugins() {
    try {
      plugins.value = await getInstalledPlugins()
      pluginsError.value = ''
    } catch (error) {
      pluginsError.value = describeLoadError(error, '插件')
    }
  }

  async function toggleAdapter(adapter: AdapterStatus) {
    busyAdapterId.value = adapter.id
    try {
      const result = adapter.loaded ? await stopAdapterById(adapter.id) : await startAdapter(adapter.id)
      if (result.adapter) {
        adapters.value = adapters.value.map(item => item.id === adapter.id ? result.adapter! : item)
      } else {
        await loadAdapters()
      }
      ElMessage.success(result.message || `${adapter.name} 已${adapter.loaded ? '停止' : '启动'}`)
    } catch (error) {
      ElMessage.error(getApiErrorMessage(error, `${adapter.name} 操作失败`))
      await loadAdapters()
    } finally {
      busyAdapterId.value = ''
    }
  }

  async function confirmPower(action: HostPowerAction) {
    const copy = powerCopy[action]
    try {
      await ElMessageBox.confirm(copy.message, copy.title, {
        confirmButtonText: copy.confirm,
        cancelButtonText: '取消',
        confirmButtonClass: action === 'shutdown' ? 'el-button--danger' : '',
        autofocus: false
      })
    } catch {
      return
    }

    powerPending.value = action
    try {
      const result = await requestHostPower(action)
      ElMessage.success(result.message || copy.done)
    } catch (error) {
      ElMessage.error(getApiErrorMessage(error, `${copy.confirm}失败`))
    } finally {
      powerPending.value = null
    }
  }

  onMounted(() => {
    void Promise.all([loadOverview(), loadAdapters(), loadPlugins(), loadLogs()])
    clockTimer = setInterval(() => { now.value = new Date() }, 30_000)
  })

  onBeforeUnmount(() => {
    if (clockTimer) clearInterval(clockTimer)
  })

  return {
    greeting,
    greetingFace,
    dateLabel,
    heroFacts,
    backendLabel,
    runtimeFacts,
    memory,
    messageTotal,
    loadAdapters,
    loadPlugins,
    loadLogs,
    health,
    uptime,
    botVersion,
    latestError,
    adapters,
    onlineAdapterCount,
    pluginSummary,
    pluginsError,
    visibleLogs,
    logCounts,
    levelFilter,
    bars,
    peakBar,
    loadError,
    adaptersError,
    logsError,
    busyAdapterId,
    powerPending,
    toggleAdapter,
    confirmPower
  }
}
