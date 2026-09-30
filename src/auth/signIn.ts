import { verifyApiKey, type ApiKeyCheck } from '../api'
import { saveBackend, type BackendProfile } from './backends'
import { saveDashboardSession } from './session'

export type SignInResult = { ok: true; profile: BackendProfile } | { ok: false; message: string }

function describeFailure(result: Extract<ApiKeyCheck, { ok: false }>, token: string) {
  if (result.reason === 'unauthorized') {
    return token ? '登录密钥不正确，请重新输入。' : '该后端已启用鉴权，请输入登录密钥。'
  }
  if (result.reason === 'unreachable') {
    return '无法连接到后端，请确认地址正确、服务正在运行，且允许跨域访问。'
  }
  return `后端返回异常（HTTP ${result.status}），请稍后重试。`
}

/** Verify the key, persist the profile (key only if `remember`), and start a session on it. */
export async function signInToBackend(
  profile: { id?: string; name: string; baseUrl: string },
  token: string,
  remember: boolean
): Promise<SignInResult> {
  const result = await verifyApiKey(token, profile.baseUrl)
  if (!result.ok) return { ok: false, message: describeFailure(result, token) }

  const saved = saveBackend({ ...profile, token }, remember)
  saveDashboardSession({
    mode: 'api',
    token,
    backendId: saved.id,
    backendName: saved.name,
    baseUrl: saved.baseUrl
  })
  return { ok: true, profile: saved }
}

const ENTER_FLAG = 'shirobot.dashboard.enter-animation'

/** Login leaves this behind so the dashboard knows to play its entrance once. */
export function markDashboardEntrance() {
  try { sessionStorage.setItem(ENTER_FLAG, '1') } catch { /* no animation, nothing else lost */ }
}

/** True exactly once after a login. */
export function consumeDashboardEntrance() {
  try {
    const pending = sessionStorage.getItem(ENTER_FLAG) === '1'
    sessionStorage.removeItem(ENTER_FLAG)
    return pending
  } catch {
    return false
  }
}

/** Full reload into the dashboard so no page keeps data from the previous backend. */
export function reloadIntoDashboard() {
  window.location.assign(import.meta.env.BASE_URL)
}
