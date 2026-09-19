export type DashboardSessionMode = 'api' | 'demo'

export interface DashboardSession {
  mode: DashboardSessionMode
  token: string
}

// Kept in sessionStorage so the key never outlives the browser session.
const SESSION_STORAGE_KEY = 'shirobot.dashboard.session'

export function getDashboardSession(): DashboardSession | null {
  const rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!rawSession) return null

  try {
    const session = JSON.parse(rawSession) as { mode?: unknown; token?: unknown }
    if (session.mode !== 'api' && session.mode !== 'demo') return null
    if (session.mode === 'demo' && !import.meta.env.DEV) return null

    return {
      mode: session.mode,
      token: session.mode === 'api' && typeof session.token === 'string' ? session.token : ''
    }
  } catch {
    return null
  }
}

export function getInitialLoginSession(): DashboardSession {
  return getDashboardSession() ?? { mode: 'api', token: '' }
}

export function saveDashboardSession(session: DashboardSession) {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    mode: session.mode,
    token: session.mode === 'api' ? session.token : ''
  }))
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

export function getSessionModeLabel(session = getDashboardSession()) {
  if (!session) return '未登录'
  return session.mode === 'demo' ? '演示模式' : 'API 模式'
}

export function getSessionStatusLabel(session = getDashboardSession()) {
  if (!session) return '未登录'
  if (session.mode === 'demo') return '已进入演示'
  return '已连接'
}

export function getSessionEndpointLabel(session = getDashboardSession()) {
  if (!session) return '—'
  return session.mode === 'demo' ? '本地演示数据' : '同源后端'
}
