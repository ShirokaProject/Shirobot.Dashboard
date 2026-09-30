import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getOverview, type OverviewResponse } from '../../api'
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
      { label: '前端面板', value: `v${DASHBOARD_VERSION}` },
      { label: '主程序', value: backendVersion.value },
      { label: '运行时', value: [runtime?.framework, runtime?.os, runtime?.arch].filter(Boolean).join(' · ') },
      { label: '运行方式', value: runtime?.mode ? modeLabels[runtime.mode] ?? runtime.mode : '' },
      { label: '构建时间', value: formatBuildTime(runtime?.build_time) }
    ].filter(fact => fact.value)
  })

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
    copyDiagnostics
  }
}
