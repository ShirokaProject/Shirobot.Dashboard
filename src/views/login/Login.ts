import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { verifyApiKey, type ApiKeyCheck } from '../../api'
import { getInitialLoginSession, saveDashboardSession } from '../../auth/session'

const DEMO_HASH = '#demo'

function describeFailure(result: Extract<ApiKeyCheck, { ok: false }>, token: string) {
  if (result.reason === 'unauthorized') {
    return token ? '登录密钥不正确，请重新输入。' : '后端已启用鉴权，请输入登录密钥。'
  }
  if (result.reason === 'unreachable') {
    return '无法连接到后端，请确认 Shirobot 正在运行。'
  }
  return `后端返回异常（HTTP ${result.status}），请稍后重试。`
}

export function useLoginPage() {
  const router = useRouter()
  const form = reactive({ token: getInitialLoginSession().token })
  const verifying = ref(false)
  const errorMessage = ref('')
  const demoEntryVisible = ref(false)

  function syncDemoEntry() {
    // Dev-only: production builds talk to the backend exclusively.
    demoEntryVisible.value = import.meta.env.DEV && window.location.hash.toLowerCase() === DEMO_HASH
  }

  async function submitLogin() {
    if (verifying.value) return

    const token = form.token.trim()
    verifying.value = true
    errorMessage.value = ''

    try {
      const result = await verifyApiKey(token)
      if (!result.ok) {
        errorMessage.value = describeFailure(result, token)
        return
      }

      saveDashboardSession({ mode: 'api', token })
      await router.replace('/')
    } finally {
      verifying.value = false
    }
  }

  function enterDemoMode() {
    saveDashboardSession({ mode: 'demo', token: '' })
    void router.replace('/')
  }

  onMounted(() => {
    syncDemoEntry()
    window.addEventListener('hashchange', syncDemoEntry)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', syncDemoEntry)
  })

  return {
    form,
    verifying,
    errorMessage,
    demoEntryVisible,
    submitLogin,
    enterDemoMode
  }
}
