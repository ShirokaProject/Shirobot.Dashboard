import { computed, h, onMounted, ref } from 'vue'
import { getDashboardSession, getSessionEndpointLabel, getSessionModeLabel, getSessionStatusLabel } from '../../auth/session'
import { getOverview, type OverviewInfo, type OverviewLatestError, type OverviewMetric, type OverviewMetricKey } from '../../api'

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
const IconCommit = makeIcon('M6 12h12M6 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm18 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z')
const IconSchedule = makeIcon('M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z')
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
  commit: '—',
  commitTime: '—',
  uptime: '—'
}

const emptyLatestError: OverviewLatestError = {
  source: '',
  message: '',
  time: ''
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
      shirobotInfo.value = response.shirobotInfo ?? { ...emptyShirobotInfo }
      latestError.value = response.latestError ?? { ...emptyLatestError }
      overviewStats.value = Array.isArray(response.stats) ? response.stats : []
      bars.value = Array.isArray(response.bars) ? response.bars : []
      events.value = Array.isArray(response.events) ? response.events : []
    } catch (error) {
      loadError.value = '后端概览接口暂不可用，请接入 /api/dashboard/overview 后刷新。'
      void error
    }
  }

  onMounted(() => {
    void loadOverview()
  })

  return {
    IconPackage,
    IconCommit,
    IconSchedule,
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
