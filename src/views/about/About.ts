import { onMounted, ref } from 'vue'
import { getOverview } from '../../api'
import { DASHBOARD_VERSION } from '../../version'

export function useAboutPage() {
  const backendVersion = ref('—')

  onMounted(async () => {
    try {
      const overview = await getOverview()
      backendVersion.value = overview.bot_version || '—'
    } catch {
      backendVersion.value = '未连接'
    }
  })

  return {
    dashboardVersion: DASHBOARD_VERSION,
    backendVersion
  }
}
