import { DEFAULT_BASE_URL, describeBaseUrl } from './backends'

export type DashboardSessionMode = 'api' | 'demo'

export interface DashboardSession {
  mode: DashboardSessionMode
  token: string
  /** Saved backend profile this session belongs to (api mode). */
  backendId?: string
  backendName?: string
  /** API origin for this session; '' means the dashboard's own origin. */
  baseUrl?: string
}

// Kept in sessionStorage so the active key never outlives the browser session
// unless the user chose to remember it on the backend profile.
const SESSION_STORAGE_KEY = 'shirobot.dashboard.session'

export function getDashboardSession(): DashboardSession | null {
  const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!rawSession) return null

  try {
    const session = JSON.parse(rawSession) as Partial<Record<keyof DashboardSession, unknown>>
    if (session.mode !== 'api' && session.mode !== 'demo') return null
    if (session.mode === 'demo' && !import.meta.env.DEV) return null

    if (session.mode === 'demo') return { mode: 'demo', token: '' }

    return {
      mode: 'api',
      token: typeof session.token === 'string' ? session.token : '',
      backendId: typeof session.backendId === 'string' ? session.backendId : undefined,
      backendName: typeof session.backendName === 'string' ? session.backendName : undefined,
      baseUrl: typeof session.baseUrl === 'string' ? session.baseUrl : DEFAULT_BASE_URL
    }
  } catch {
    return null
  }
}

export function saveDashboardSession(session: DashboardSession) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(
    session.mode === 'demo'
      ? { mode: 'demo', token: '' }
      : session
  ))
}

export function clearDashboardSession() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
}

export function hasDashboardSession() {
  return Boolean(getDashboardSession())
}

export function isDemoMode() {
  return getDashboardSession()?.mode === 'demo'
}

/** API origin for the current session, falling back to the build-time default. */
export function getSessionBaseUrl(session = getDashboardSession()) {
  return session?.mode === 'api' ? session.baseUrl ?? DEFAULT_BASE_URL : DEFAULT_BASE_URL
}

export function getSessionModeLabel(session = getDashboardSession()) {
  if (!session) return '未登录'
  if (session.mode === 'demo') return '演示模式'
  return session.backendName || 'API 模式'
}

export function getSessionStatusLabel(session = getDashboardSession()) {
  if (!session) return '未登录'
  if (session.mode === 'demo') return '已进入演示'
  const address = describeBaseUrl(getSessionBaseUrl(session))
  // An unnamed backend is labelled by its address already; don't print it twice.
  return !session.backendName || session.backendName === address ? '已连接' : address
}

export function getSessionEndpointLabel(session = getDashboardSession()) {
  if (!session) return '—'
  return session.mode === 'demo' ? '本地演示数据' : describeBaseUrl(getSessionBaseUrl(session))
}
