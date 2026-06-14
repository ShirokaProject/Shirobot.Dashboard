import type { KindFilter, RuntimeLog } from '../../features/logs/types'
import { apiRequest } from '../core/http'

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
  return apiRequest<RuntimeLogsResponse>(`/api/runtime/logs${search ? `?${search}` : ''}`)
}
