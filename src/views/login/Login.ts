import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { BACKEND_SWITCHING_ENABLED, describeBaseUrl, listBackends, normalizeBaseUrl, removeBackend, saveBackend, type BackendProfile } from '../../auth/backends'
import { DEMO_ENABLED, getDashboardSession, hasDashboardSession, saveDashboardSession } from '../../auth/session'
import { markDashboardEntrance, reloadIntoDashboard, signInToBackend } from '../../auth/signIn'

const DEMO_HASH = '#demo'
const ENTER_TRANSITION_MS = 320

export function useLoginPage() {
  const router = useRouter()
  const route = useRoute()
  const session = getDashboardSession()
  const switching = hasDashboardSession()

  const backends = ref<BackendProfile[]>(listBackends())
  const requestedId = typeof route.query.backend === 'string' ? route.query.backend : undefined
  const selectedId = ref(
    backends.value.find(profile => profile.id === requestedId)?.id
      ?? backends.value.find(profile => profile.id === session?.backendId)?.id
      ?? backends.value[0]?.id
      ?? ''
  )
  const switchingEnabled = BACKEND_SWITCHING_ENABLED
  const adding = ref(switchingEnabled && (route.query.add !== undefined || backends.value.length === 0))
  const draft = reactive({ name: '', baseUrl: '' })
  const form = reactive({ token: '', remember: false })
  const showToken = ref(false)
  const verifying = ref(false)
  // Set once the key checks out: the card plays its exit animation before the dashboard loads
  const entering = ref(false)
  const errorMessage = ref('')
  const demoEntryVisible = ref(false)

  const selected = computed(() => backends.value.find(profile => profile.id === selectedId.value))
  const selectedName = computed(() => selected.value?.name ?? '后端')
  const selectedAddress = computed(() => selected.value ? describeBaseUrl(selected.value.baseUrl) : '')
  const activeBackendId = session?.mode === 'api' ? session.backendId : undefined

  function backendState(profile: BackendProfile) {
    if (profile.id === activeBackendId) return { tone: 'success', label: '当前已登录' }
    if (profile.token) return { tone: 'primary', label: '已记住密钥' }
    return { tone: 'neutral', label: '需要登录' }
  }

  // Prefill from the remembered key, or from the live session when re-entering the same backend.
  function syncCredentials() {
    const profile = selected.value
    if (adding.value || !profile) {
      form.token = ''
      form.remember = false
      return
    }
    form.token = profile.token ?? (session?.backendId === profile.id ? session.token : '')
    form.remember = Boolean(profile.token)
  }

  watch([selectedId, adding], () => {
    showToken.value = false
    errorMessage.value = ''
    syncCredentials()
  }, { immediate: true })

  function selectBackend(id: string) {
    selectedId.value = id
    adding.value = false
  }

  function startAdding() {
    adding.value = true
    draft.name = ''
    draft.baseUrl = ''
  }

  async function forgetBackend(id: string) {
    const name = backends.value.find(profile => profile.id === id)?.name ?? '这个后端'
    try {
      await ElMessageBox.confirm(`将从此设备移除「${name}」，并忘掉已记住的密钥。`, '移除后端？', {
        confirmButtonText: '移除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      })
    } catch {
      return
    }
    removeBackend(id)
    backends.value = listBackends()
    if (!backends.value.some(profile => profile.id === selectedId.value)) {
      selectedId.value = backends.value[0]?.id ?? ''
    }
    if (!backends.value.length) startAdding()
  }

  // Adding only saves the address; signing in is the next, separate step.
  function addBackend() {
    const baseUrl = normalizeBaseUrl(draft.baseUrl)
    if (!baseUrl) {
      errorMessage.value = '请填写后端地址。'
      return
    }
    if (backends.value.some(profile => profile.baseUrl === baseUrl)) {
      errorMessage.value = '这个后端已经添加过了。'
      return
    }
    const saved = saveBackend({ name: draft.name, baseUrl }, false)
    backends.value = listBackends()
    selectedId.value = saved.id
    adding.value = false
  }

  async function submitLogin() {
    if (verifying.value) return
    if (adding.value) {
      addBackend()
      return
    }

    const target = selected.value
    if (!target) return

    verifying.value = true
    errorMessage.value = ''
    try {
      const result = await signInToBackend(target, form.token.trim(), form.remember)
      if (!result.ok) {
        errorMessage.value = result.message
        return
      }
      await playEnterTransition()
      if (switching) reloadIntoDashboard()
      else await router.replace('/')
    } finally {
      verifying.value = false
    }
  }

  async function playEnterTransition() {
    entering.value = true
    markDashboardEntrance()
    await new Promise(resolve => window.setTimeout(resolve, ENTER_TRANSITION_MS))
  }

  async function enterDemoMode() {
    saveDashboardSession({ mode: 'demo', token: '' })
    await playEnterTransition()
    if (switching) reloadIntoDashboard()
    else void router.replace('/')
  }

  function cancelSwitch() {
    void router.replace('/')
  }

  function syncDemoEntry() {
    // A demo build (the public site) always offers it; in dev it hides behind #demo.
    // Regular release builds have no demo mode at all.
    const asked = window.location.hash.toLowerCase() === DEMO_HASH || session?.mode === 'demo'
    demoEntryVisible.value = DEMO_ENABLED && (!import.meta.env.DEV || asked)
  }

  onMounted(() => {
    syncDemoEntry()
    window.addEventListener('hashchange', syncDemoEntry)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', syncDemoEntry)
  })

  return {
    switchingEnabled,
    backends,
    selectedId,
    selectedName,
    selectedAddress,
    adding,
    draft,
    form,
    showToken,
    verifying,
    entering,
    errorMessage,
    demoEntryVisible,
    switching,
    describeBaseUrl,
    backendState,
    selectBackend,
    startAdding,
    forgetBackend,
    submitLogin,
    enterDemoMode,
    cancelSwitch
  }
}
