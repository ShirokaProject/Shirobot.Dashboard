import type { KindFilter, RuntimeLog } from '../../features/logs/types'
import { getDashboardSession, getSessionBaseUrl } from '../../auth/session'
import { apiRequest } from '../core/http'

export type LogSourceKind = 'system' | 'adapter' | 'plugin'

export interface LogSourceInfo {
  source: string
  description: string
  plugin_name?: string
  /** What produced the source; older hosts omit it. */
  kind?: LogSourceKind
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

export interface RuntimeLogsQuery {
  source?: string
  kind?: KindFilter
  cursor?: string
  limit?: number
}

export interface RuntimeLogsResponse {
  logs: RuntimeLog[]
  nextCursor?: string
}

export function getRuntimeLogs(query: RuntimeLogsQuery = {}) {
  const params = new URLSearchParams()

  if (query.source && query.source !== 'ALL') params.set('source', query.source)
  if (query.kind && query.kind !== 'ALL') params.set('kind', query.kind)
  if (query.cursor) params.set('cursor', query.cursor)
  if (query.limit) params.set('limit', String(query.limit))

  const search = params.toString()
  return apiRequest<RuntimeLogsResponse>(`/api/v1/runtime/logs${search ? `?${search}` : ''}`)
}

export function getLogSources() {
  return apiRequest<LogSourceInfo[]>('/api/v1/logs/sources')
}

export function getLogStreamUrl() {
  const session = getDashboardSession()
  const path = '/api/v1/logs/stream'

  const baseUrl = getSessionBaseUrl(session)
  const url = baseUrl
    ? new URL(path, `${baseUrl.replace(/\/$/, '')}/`)
    : new URL(path, window.location.origin)

  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'

  if (session?.token.trim()) {
    url.searchParams.set('token', session.token.trim())
  }

  return url.toString()
}
