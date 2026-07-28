import { getDashboardSession } from '../../auth/session'
import { apiRequest } from '../core/http'
import { API_BASE_URL } from '../core/http'

export interface LogSourceInfo {
  source: string
  description: string
  plugin_name?: string
}

export type BackendLogLevel = 'log' | 'info' | 'warning' | 'error' | 'success'

export interface LogEntry {
  time: string
  source: string
  level: BackendLogLevel
  message: string
}

export interface LogStreamConnectedMessage {
  type: 'connected'
  source: string
  tail: number
}

export interface LogStreamDataMessage {
  type: 'history' | 'logs'
  data: Array<LogEntry | string>
}

export type LogStreamMessage = LogStreamConnectedMessage | LogStreamDataMessage

export function getLogSources() {
  return apiRequest<LogSourceInfo[]>('/api/v1/logs/sources')
}

export function getLogStreamUrl() {
  const session = getDashboardSession()
  const apiBaseUrl = session?.apiBaseUrl || API_BASE_URL
  const path = '/api/v1/logs/stream'

  const url = apiBaseUrl
    ? new URL(path, `${apiBaseUrl.replace(/\/$/, '')}/`)
    : new URL(path, window.location.origin)

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

  if (session?.token.trim()) {
    url.searchParams.set('token', session.token.trim())
  }

  return url.toString()
}
