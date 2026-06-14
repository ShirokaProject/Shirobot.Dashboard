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
