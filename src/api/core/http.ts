import { getDashboardSession, isDemoMode } from '../../auth/session'
import { getDemoApiResponse } from '../demo'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly body?: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (typeof error.body === 'string' && error.body.trim()) return error.body
    if (error.body && typeof error.body === 'object' && 'message' in error.body) {
      const message = (error.body as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) return message
    }
    if (error.body && typeof error.body === 'object' && 'msg' in error.body) {
      const message = (error.body as { msg?: unknown }).msg
      if (typeof message === 'string' && message.trim()) return message
    }
  }

  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

function getActiveApiBaseUrl() {
  const session = getDashboardSession()
  return session?.apiBaseUrl ?? API_BASE_URL
}

function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path

  const apiBaseUrl = getActiveApiBaseUrl()
  if (!apiBaseUrl) return path

  return `${apiBaseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
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
  if (isDemoMode()) {
    return getDemoApiResponse<T>(path, init)
  }

  const response = await fetch(buildApiUrl(path), buildRequestInit(init))

  if (!response.ok) {
    let body: unknown = null
    try {
      body = await readResponseBody(response)
    } catch (error) {
      body = error instanceof ApiError ? error.body : null
    }
    throw new ApiError(response.statusText || 'API request failed', response.status, body)
  }

  return await readResponseBody(response) as T
}

export async function verifyApiAccess(apiBaseUrl: string, token: string) {
  const baseUrl = apiBaseUrl.trim()
  const url = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/api/v1/auth`
    : '/api/v1/auth'
  const headers = new Headers()
  if (token.trim()) headers.set('Authorization', `Bearer ${token.trim()}`)

  const response = await fetch(url, { headers })
  if (!response.ok) {
    let body: unknown = null
    try {
      body = await readResponseBody(response)
    } catch (error) {
      body = error instanceof ApiError ? error.body : null
    }
    throw new ApiError(response.statusText || 'API authentication failed', response.status, body)
  }

  return await readResponseBody(response) as { ok: boolean }
}
