import { apiRequest } from '../core/http'

export interface OverviewInfo {
  version: string
  commit: string
  commitTime: string
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
  title: string
  time: string
}

export interface OverviewResponse {
  shirobotInfo: OverviewInfo
  latestError: OverviewLatestError
  stats: OverviewMetric[]
  bars: number[]
  events: OverviewEvent[]
}

export function getOverview() {
  return apiRequest<OverviewResponse>('/api/dashboard/overview')
}
