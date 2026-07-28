import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getApiErrorMessage, verifyApiAccess } from '../../api'
import {
  getDashboardProfileToken,
  getDashboardProfiles,
  getInitialLoginSession,
  saveDashboardSession,
  type DashboardProfile,
  type DashboardSessionMode
} from '../../auth/session'

export function useLoginPage() {
  const router = useRouter()
  const initialSession = getInitialLoginSession()
  const profiles = ref<DashboardProfile[]>(getDashboardProfiles())
  const selectedProfileId = ref(initialSession.profileId)
  const mode = ref<DashboardSessionMode>(initialSession.mode)
  const showEndpointSettings = ref(Boolean(initialSession.apiBaseUrl))
  const form = reactive({
    apiBaseUrl: initialSession.apiBaseUrl,
    token: initialSession.token
  })

  const isDemoMode = computed(() => mode.value === 'demo')
  const loginError = ref('')
  const submitting = ref(false)

  function syncProfiles() {
    profiles.value = getDashboardProfiles()
  }

  function selectProfile(profile: DashboardProfile) {
    selectedProfileId.value = profile.id
    mode.value = profile.mode
    form.apiBaseUrl = profile.apiBaseUrl
    form.token = profile.mode === 'api' ? getDashboardProfileToken(profile.id) : ''
    showEndpointSettings.value = Boolean(profile.apiBaseUrl)
    loginError.value = ''
  }

  async function submitLogin() {
    if (submitting.value) return
    loginError.value = ''
    if (!isDemoMode.value) {
      const baseUrl = form.apiBaseUrl.trim()
      if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
        loginError.value = '接口地址需要以 http:// 或 https:// 开头。'
        return
      }
    }
    submitting.value = true
    try {
      if (!isDemoMode.value) {
        await verifyApiAccess(form.apiBaseUrl.trim(), form.token.trim())
      }
      saveDashboardSession({
        mode: mode.value,
        apiBaseUrl: isDemoMode.value ? '' : form.apiBaseUrl.trim(),
        token: isDemoMode.value ? '' : form.token.trim()
      })
      syncProfiles()
      await router.replace('/')
    } catch (error) {
      loginError.value = getApiErrorMessage(error, '无法连接后端或 Token 无效。')
    } finally {
      submitting.value = false
    }
  }

  function toggleEndpointSettings() {
    showEndpointSettings.value = !showEndpointSettings.value
  }

  return {
    mode,
    form,
    profiles,
    selectedProfileId,
    isDemoMode,
    showEndpointSettings,
    loginError,
    submitting,
    selectProfile,
    submitLogin,
    toggleEndpointSettings
  }
}
