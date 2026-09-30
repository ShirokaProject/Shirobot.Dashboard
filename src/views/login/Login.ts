import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { describeBaseUrl, listBackends, normalizeBaseUrl, removeBackend, type BackendProfile } from '../../auth/backends'
import { getDashboardSession, hasDashboardSession, saveDashboardSession } from '../../auth/session'
import { reloadIntoDashboard, signInToBackend } from '../../auth/signIn'

const DEMO_HASH = '#demo'

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
  const adding = ref(route.query.add !== undefined)
  const draft = reactive({ name: '', baseUrl: '' })
  const form = reactive({ token: '', remember: false })
  const verifying = ref(false)
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

  function forgetBackend(id: string) {
    removeBackend(id)
    backends.value = listBackends()
    if (!backends.value.some(profile => profile.id === selectedId.value)) {
      selectedId.value = backends.value[0]?.id ?? ''
    }
  }

  async function submitLogin() {
    if (verifying.value) return

    const target = adding.value
      ? { name: draft.name, baseUrl: normalizeBaseUrl(draft.baseUrl) }
      : selected.value
    if (!target) return

    verifying.value = true
    errorMessage.value = ''
    try {
      const result = await signInToBackend(target, form.token.trim(), form.remember)
      if (!result.ok) {
        errorMessage.value = result.message
        return
      }
      if (switching) reloadIntoDashboard()
      else await router.replace('/')
    } finally {
      verifying.value = false
    }
  }

  function enterDemoMode() {
    saveDashboardSession({ mode: 'demo', token: '' })
    if (switching) reloadIntoDashboard()
    else void router.replace('/')
  }

  function cancelSwitch() {
    void router.replace('/')
  }

  function syncDemoEntry() {
    // Dev-only: production builds talk to real backends exclusively.
    demoEntryVisible.value = import.meta.env.DEV && (window.location.hash.toLowerCase() === DEMO_HASH || session?.mode === 'demo')
  }

  onMounted(() => {
    syncDemoEntry()
    window.addEventListener('hashchange', syncDemoEntry)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', syncDemoEntry)
  })

  return {
    backends,
    selectedId,
    selectedName,
    selectedAddress,
    adding,
    draft,
    form,
    verifying,
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
