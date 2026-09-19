import { getDashboardSession, isDemoMode } from '../../auth/session'

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
  }

  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  if (!API_BASE_URL) return path

  return `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
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
  // Dev-only: the demo dataset is dropped from production builds.
  if (import.meta.env.DEV && isDemoMode()) {
    const { getDemoApiResponse } = await import('../demo')
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
