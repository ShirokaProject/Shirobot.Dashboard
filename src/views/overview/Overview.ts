import { computed, h, onMounted, ref } from 'vue'
import { getDashboardSession, getSessionEndpointLabel, getSessionModeLabel, getSessionStatusLabel } from '../../auth/session'
import { getOverview, type OverviewEvent, type OverviewInfo, type OverviewLatestError, type OverviewMetric, type OverviewMetricKey, type OverviewResponse } from '../../api'

const makeIcon = (path: string) => () => h(
  'svg',
  {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  },
  [h('path', { d: path })]
)

const IconPackage = makeIcon('M16.5 9.4 7.5 4.2 3 6.8l9 5.2 9-5.2-4.5-2.6ZM3 6.8v10.4l9 5.2V12L3 6.8Zm18 0L12 12v10.4l9-5.2V6.8Z')
const IconTimer = makeIcon('M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z')
const IconError = makeIcon('M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z')
const IconEvent = makeIcon('M22 12h-4l-3 8L9 4l-3 8H2')
const IconCpu = makeIcon('M9 9h6v6H9V9Zm-3 0H3m3 6H3m18-6h-3m3 6h-3M9 3v3m6-3v3M9 18v3m6-3v3')
const IconCheck = makeIcon('m5 12 4 4L19 6')

const metricIconMap: Record<OverviewMetricKey, ReturnType<typeof makeIcon>> = {
  plugins: IconPackage,
  adapters: IconCpu,
  messages: IconEvent,
  health: IconCheck
}

const emptyShirobotInfo: OverviewInfo = {
  version: '—',
  uptime: '—'
}

const emptyLatestError: OverviewLatestError = {
  source: '',
  message: '',
  time: ''
}

const adapterStatusLabel: Record<NonNullable<OverviewResponse['adapter_status']>, string> = {
  connected: '在线',
  disconnected: '离线',
  unknown: '状态未知'
}

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '—'

  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${Math.max(minutes, 1)}m`
}

function buildStats(response: OverviewResponse): OverviewMetric[] {
  const adapterStatus = response.adapter_status ? adapterStatusLabel[response.adapter_status] : '状态未知'
  const healthStatus = response.health_status || (response.adapter_status === 'disconnected' ? '异常' : '正常')

  return [
    { key: 'plugins', label: '活跃插件', value: String(response.plugins_count ?? 0), support: '当前已加载插件数量' },
    { key: 'adapters', label: '适配器', value: response.adapter || '—', support: `当前适配器${adapterStatus}` },
    { key: 'messages', label: '今日消息', value: String(response.message_count ?? 0), support: '过去 24 小时消息统计' },
    { key: 'health', label: '健康状态', value: healthStatus, support: '核心服务运行状态' }
  ]
}

function buildBars(response: OverviewResponse) {
  const counts = Array.isArray(response.message_freq) ? response.message_freq.map(item => Number(item.count) || 0) : []
  const maxCount = Math.max(...counts, 0)

  if (maxCount <= 0) return counts.map(() => 0)

  return counts.map(count => Math.max(8, Math.round((count / maxCount) * 100)))
}

function buildEvents(events: OverviewEvent[]) {
  if (!Array.isArray(events)) return []
  return events.map(event => ({
    title: event.message,
    time: event.time
  }))
}

export function useOverviewPage() {
  const shirobotInfo = ref<OverviewInfo>({ ...emptyShirobotInfo })
  const latestError = ref<OverviewLatestError>({ ...emptyLatestError })
  const overviewStats = ref<OverviewMetric[]>([])
  const bars = ref<number[]>([])
  const events = ref<Array<{ title: string; time: string }>>([])
  const loadError = ref('')
  const session = computed(() => getDashboardSession())
  const loginModeLabel = computed(() => getSessionModeLabel(session.value))
  const loginStatusLabel = computed(() => getSessionStatusLabel(session.value))
  const loginEndpointLabel = computed(() => getSessionEndpointLabel(session.value))

  const stats = computed(() => overviewStats.value.map(item => ({
    ...item,
    icon: metricIconMap[item.key]
  })))

  async function loadOverview() {
    loadError.value = ''
    try {
      const response = await getOverview()
      shirobotInfo.value = {
        version: response.bot_version || '—',
        uptime: formatDuration(Number(response.uptime_seconds))
      }
      latestError.value = response.latest_error ?? { ...emptyLatestError }
      overviewStats.value = buildStats(response)
      bars.value = buildBars(response)
      events.value = buildEvents(response.events)
    } catch (error) {
      loadError.value = '后端概览接口暂不可用，请接入 /api/v1/overview 后刷新。'
      void error
    }
  }

  onMounted(() => {
    void loadOverview()
  })

  return {
    IconPackage,
    IconTimer,
    IconError,
    IconEvent,
    shirobotInfo,
    latestError,
    stats,
    bars,
    events,
    loadError,
    loginModeLabel,
    loginStatusLabel,
    loginEndpointLabel
  }
}
