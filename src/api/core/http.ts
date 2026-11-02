import { getDashboardSession, getSessionBaseUrl, isDemoMode } from '../../auth/session'
import { ApiError } from './errors'

export { ApiError, getApiErrorMessage } from './errors'

export const HOST_STATE_CHANGED_EVENT = 'shirobot-host-state-changed'

let unauthorizedHandler: (() => void) | undefined

/** Called once the backend rejects the session's key (HTTP 401) on a regular request. */
export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler
}

/** Resolve an API path against a backend origin ('' = same origin); defaults to the session's backend. */
export function buildApiUrl(path: string, baseUrl = getSessionBaseUrl()) {
  if (/^https?:\/\//i.test(path)) return path
  if (!baseUrl) return path

  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

function buildRequestInit(init?: RequestInit): RequestInit | undefined {
  const token = getDashboardSession()?.token.trim()
  if (!token) return init

  const headers = new Headers(init?.headers)
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return {
    ...init,
    headers
  }
}

async function readResponseBody(response: Response) {
  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    const text = await response.text()
    throw new ApiError('API response is not JSON', response.status, text || null)
  }

  return response.json()
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    return await performRequest<T>(path, init)
  } finally {
    const method = init?.method?.toUpperCase() ?? 'GET'
    if (typeof window !== 'undefined' && method !== 'GET' && method !== 'HEAD') {
      window.dispatchEvent(new Event(HOST_STATE_CHANGED_EVENT))
    }
  }
}

async function performRequest<T>(path: string, init?: RequestInit): Promise<T> {
  // Dev-only: the demo dataset is dropped from production builds.
  // Spelled out (not DEMO_ENABLED) so regular builds drop the demo chunk entirely
  if ((import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true') && isDemoMode()) {
    const { getDemoApiResponse } = await import('../demo')
    return getDemoApiResponse<T>(path, init)
  }

  const response = await authenticatedResponse(path, init)

  return await readResponseBody(response) as T
}

/** Binary data uses the same session backend and Bearer authentication as JSON requests. */
export async function apiBlobRequest(path: string, init?: RequestInit): Promise<Blob> {
  return (await authenticatedResponse(path, init)).blob()
}

async function authenticatedResponse(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), buildRequestInit(init))

  if (!response.ok) {
    let body: unknown = null
    try {
      body = await readResponseBody(response)
    } catch (error) {
      body = error instanceof ApiError ? error.body : null
    }
    if (response.status === 401 && getDashboardSession()?.mode === 'api') unauthorizedHandler?.()
    throw new ApiError(response.statusText || 'API request failed', response.status, body)
  }

  return response
}
