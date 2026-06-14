import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
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

  function syncProfiles() {
    profiles.value = getDashboardProfiles()
  }

  function selectProfile(profile: DashboardProfile) {
    selectedProfileId.value = profile.id
    mode.value = profile.mode
    form.apiBaseUrl = profile.apiBaseUrl
    form.token = profile.mode === 'api' ? getDashboardProfileToken(profile.id) : ''
    showEndpointSettings.value = Boolean(profile.apiBaseUrl)
  }

  function submitLogin() {
    saveDashboardSession({
      mode: mode.value,
      apiBaseUrl: isDemoMode.value ? '' : form.apiBaseUrl.trim(),
      token: isDemoMode.value ? '' : form.token.trim()
    })
    syncProfiles()
    router.replace('/')
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
    selectProfile,
    submitLogin,
    toggleEndpointSettings
  }
}
