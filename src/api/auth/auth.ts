import { buildApiUrl } from '../core/http'

export type ApiKeyCheck =
  | { ok: true }
  | { ok: false; reason: 'unauthorized' }
  | { ok: false; reason: 'unreachable' }
  | { ok: false; reason: 'server'; status: number }

/** Check a key against a specific backend origin ('' = same origin) before a session exists. */
export async function verifyApiKey(token: string, baseUrl: string): Promise<ApiKeyCheck> {
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(buildApiUrl('/api/v1/auth', baseUrl), { headers })
  } catch {
    return { ok: false, reason: 'unreachable' }
  }

  if (response.ok) return { ok: true }
  if (response.status === 401 || response.status === 403) return { ok: false, reason: 'unauthorized' }
  return { ok: false, reason: 'server', status: response.status }
}
