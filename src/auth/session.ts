export type DashboardSessionMode = 'api' | 'demo'

export interface DashboardSession {
  profileId: string
  mode: DashboardSessionMode
  apiBaseUrl: string
  token: string
}

export interface DashboardProfile {
  id: string
  label: string
  mode: DashboardSessionMode
  apiBaseUrl: string
  updatedAt: number
}

interface PersistedDashboardSession {
  profileId: string
  mode: DashboardSessionMode
  apiBaseUrl: string
}

const SESSION_STORAGE_KEY = 'shirobot.dashboard.session'
const PROFILES_STORAGE_KEY = 'shirobot.dashboard.profiles'
const TOKEN_STORAGE_PREFIX = 'shirobot.dashboard.profile-token.'

const defaultSession: DashboardSession = {
  profileId: createProfileId('api', import.meta.env.VITE_API_BASE_URL ?? ''),
  mode: 'api',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  token: ''
}

function createProfileId(mode: DashboardSessionMode, apiBaseUrl: string) {
  const source = `${mode}:${apiBaseUrl.trim() || 'same-origin'}`
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0
  }
  return `${mode}-${Math.abs(hash).toString(36)}`
}

function createProfileLabel(mode: DashboardSessionMode, apiBaseUrl: string) {
  if (mode === 'demo') return '演示模式'
  if (!apiBaseUrl.trim()) return '同源后端'

  try {
    return new URL(apiBaseUrl).host
  } catch {
    return apiBaseUrl.trim()
  }
}

function tokenKey(profileId: string) {
  return `${TOKEN_STORAGE_PREFIX}${profileId}`
}

function normalizeProfile(profile: Partial<DashboardProfile>): DashboardProfile | null {
  if (profile.mode !== 'api' && profile.mode !== 'demo') return null

  const apiBaseUrl = profile.mode === 'api' ? profile.apiBaseUrl ?? '' : ''
  const id = profile.id || createProfileId(profile.mode, apiBaseUrl)

  return {
    id,
    mode: profile.mode,
    apiBaseUrl,
    label: profile.label || createProfileLabel(profile.mode, apiBaseUrl),
    updatedAt: typeof profile.updatedAt === 'number' ? profile.updatedAt : Date.now()
  }
}

export function getDashboardProfiles(): DashboardProfile[] {
  const rawProfiles = localStorage.getItem(PROFILES_STORAGE_KEY)
  if (!rawProfiles) return []

  try {
    const profiles = JSON.parse(rawProfiles) as Array<Partial<DashboardProfile>>
    return profiles
      .map(normalizeProfile)
      .filter((profile): profile is DashboardProfile => Boolean(profile))
      .sort((left, right) => right.updatedAt - left.updatedAt)
  } catch {
    return []
  }
}

function saveDashboardProfiles(profiles: DashboardProfile[]) {
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles.slice(0, 8)))
}

function upsertDashboardProfile(session: Pick<DashboardSession, 'mode' | 'apiBaseUrl'>) {
  const profile = normalizeProfile({
    id: createProfileId(session.mode, session.mode === 'api' ? session.apiBaseUrl : ''),
    mode: session.mode,
    apiBaseUrl: session.mode === 'api' ? session.apiBaseUrl : '',
    updatedAt: Date.now()
  })

  if (!profile) return null

  const nextProfiles = [
    profile,
    ...getDashboardProfiles().filter(item => item.id !== profile.id)
  ]
  saveDashboardProfiles(nextProfiles)
  return profile
}

export function getDashboardProfileToken(profileId: string) {
  return sessionStorage.getItem(tokenKey(profileId)) ?? ''
}

export function getDashboardSession(): DashboardSession | null {
  const rawSession = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!rawSession) return null

  try {
    const session = JSON.parse(rawSession) as Partial<PersistedDashboardSession>
    if (session.mode !== 'api' && session.mode !== 'demo') return null

    const apiBaseUrl = session.mode === 'api' ? session.apiBaseUrl ?? '' : ''
    const profileId = session.profileId || createProfileId(session.mode, apiBaseUrl)

    return {
      profileId,
      mode: session.mode,
      apiBaseUrl,
      token: session.mode === 'api' ? getDashboardProfileToken(profileId) : ''
    }
  } catch {
    return null
  }
}

export function getInitialLoginSession(): DashboardSession {
  const session = getDashboardSession()
  if (session) return session

  return {
    ...defaultSession,
    token: ''
  }
}

export function saveDashboardSession(session: Omit<DashboardSession, 'profileId'> | DashboardSession) {
  const profile = upsertDashboardProfile(session)
  const profileId = profile?.id ?? ('profileId' in session ? session.profileId : createProfileId(session.mode, session.apiBaseUrl))
  const apiBaseUrl = session.mode === 'api' ? session.apiBaseUrl : ''

  const persistedSession: PersistedDashboardSession = {
    profileId,
    mode: session.mode,
    apiBaseUrl
  }

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(persistedSession))

  if (session.mode === 'api' && session.token) {
    sessionStorage.setItem(tokenKey(profileId), session.token)
  }
}

export function clearDashboardSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY)
}

export function hasDashboardSession() {
  const session = getDashboardSession()
  if (!session) return false
  if (session.mode === 'demo') return true
  return Boolean(session.apiBaseUrl || session.token)
}

export function isDemoMode() {
  return getDashboardSession()?.mode === 'demo'
}

export function getSessionModeLabel(session = getDashboardSession()) {
  if (!session) return '未登录'
  return session.mode === 'demo' ? '演示模式' : 'API 模式'
}

export function getSessionStatusLabel(session = getDashboardSession()) {
  if (!session) return '未登录'
  if (session.mode === 'demo') return '已进入演示'
  if (session.token) return '已连接'
  return '等待 Token'
}

export function getSessionEndpointLabel(session = getDashboardSession()) {
  if (!session) return '—'
  if (session.mode === 'demo') return '本地演示数据'
  if (!session.apiBaseUrl) return '同源后端'

  try {
    return new URL(session.apiBaseUrl).host
  } catch {
    return session.apiBaseUrl
  }
}
