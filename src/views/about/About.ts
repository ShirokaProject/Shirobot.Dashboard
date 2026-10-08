import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { applyHostUpdate, checkHostUpdate, getApiErrorMessage, getOverview, type HostUpdateCheck, type OverviewResponse } from '../../api'
import { DOCS_URL } from '../../features/docs'
import { DASHBOARD_VERSION } from '../../version'

export const ORG_URL = 'https://github.com/ShirokaProject'

export const links = [
  { icon: 'github', label: 'GitHub 组织', detail: 'github.com/ShirokaProject', href: ORG_URL },
  { icon: 'link', label: '官方文档', detail: 'docs.shiroka.org', href: DOCS_URL },
  { icon: 'error', label: '问题反馈', detail: '在 GitHub 提交 Issue', href: `${ORG_URL}/ShiroBot/issues` }
] as const

const modeLabels: Record<string, string> = { docker: 'Docker', native: '直接运行', systemd: 'systemd 服务' }

function formatBuildTime(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
}

export function useAboutPage() {
  const overview = ref<OverviewResponse | null>(null)
  const updateCheck = ref<HostUpdateCheck | null>(null)
  const checkingUpdate = ref(false)
  const applyingUpdate = ref(false)
  const restarting = ref(false)
  const updateError = ref('')
  const loadState = ref<'loading' | 'ready' | 'error'>('loading')

  onMounted(async () => {
    try {
      overview.value = await getOverview()
      loadState.value = 'ready'
    } catch {
      loadState.value = 'error'
    }
  })

  const backendVersion = computed(() => {
    if (loadState.value === 'loading') return '读取中…'
    if (loadState.value === 'error') return '未连接'
    return overview.value?.bot_version || '—'
  })

  // Only rows the backend actually reported
  const versionFacts = computed(() => {
    const runtime = overview.value?.runtime
    return [
      { label: '前端面板', value: DASHBOARD_VERSION },
      { label: '主程序', value: backendVersion.value },
      { label: 'SDK ABI', value: overview.value?.sdk_abi_version },
      { label: '运行时', value: [runtime?.framework, runtime?.os, runtime?.arch].filter(Boolean).join(' · ') },
      { label: '运行方式', value: runtime?.mode ? modeLabels[runtime.mode] ?? runtime.mode : '' },
      { label: '构建时间', value: formatBuildTime(runtime?.build_time) }
    ].filter(fact => fact.value)
  })

  async function checkUpdate() {
    if (checkingUpdate.value || applyingUpdate.value || restarting.value) return
    checkingUpdate.value = true
    updateError.value = ''
    updateCheck.value = null
    try {
      updateCheck.value = await checkHostUpdate()
    } catch (error) {
      updateError.value = getApiErrorMessage(error, '检查宿主更新失败')
    } finally {
      checkingUpdate.value = false
    }
  }

  async function updateAndRestart() {
    if (!updateCheck.value?.can_apply || applyingUpdate.value || restarting.value) return
    applyingUpdate.value = true
    try {
      try {
        await ElMessageBox.confirm(
          `将更新主程序到 ${updateCheck.value.latest_version} 并重启，连接会暂时中断。`,
          '更新宿主',
          { confirmButtonText: '更新并重启', cancelButtonText: '取消', type: 'warning' }
        )
      } catch {
        return
      }
      const result = await applyHostUpdate()
      if (!result.ok) throw new Error(result.message || '宿主更新失败')
      restarting.value = result.restarting
      ElMessage.success(result.message)
      if (!result.restarting) {
        applyingUpdate.value = false
        await checkUpdate()
      }
    } catch (error) {
      updateError.value = getApiErrorMessage(error, '宿主更新失败')
      ElMessage.error(updateError.value)
    } finally {
      applyingUpdate.value = false
    }
  }

  /** Plain-text summary for bug reports */
  async function copyDiagnostics() {
    const lines = [
      ...versionFacts.value.map(fact => `${fact.label}: ${fact.value}`),
      `浏览器: ${navigator.userAgent}`
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      ElMessage.success('诊断信息已复制，可以直接贴到 Issue 里')
    } catch {
      ElMessage.error('复制失败，浏览器不允许访问剪贴板')
    }
  }

  return {
    dashboardVersion: DASHBOARD_VERSION,
    versionFacts,
    copyDiagnostics,
    updateCheck, checkingUpdate, applyingUpdate, restarting, updateError, checkUpdate, updateAndRestart
  }
}
