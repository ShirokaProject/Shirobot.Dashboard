import { apiRequest } from '../core/http'

export interface OverviewInfo {
  version: string
  uptime: string
}

export interface OverviewLatestError {
  source: string
  message: string
  time: string
}

export type OverviewMetricKey = 'plugins' | 'adapters' | 'messages' | 'health'

export interface OverviewMetric {
  key: OverviewMetricKey
  label: string
  value: string
  support: string
}

export interface OverviewEvent {
  message: string
  time: string
  level?: 'info' | 'warning' | 'error'
}

export interface OverviewMessageFrequency {
  start_time: string
  end_time: string
  count: number
}

export interface OverviewResponse {
  bot_version: string
  uptime_seconds: number
  plugins_count: number
  adapter: string
  adapter_status?: 'connected' | 'disconnected' | 'unknown'
  message_count: number
  message_freq: OverviewMessageFrequency[]
  latest_error?: OverviewLatestError | null
  health_status?: string
  events: OverviewEvent[]
}

export function getOverview() {
  return apiRequest<OverviewResponse>('/api/v1/overview')
}
