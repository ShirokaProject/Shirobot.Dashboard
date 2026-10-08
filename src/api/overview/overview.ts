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

export type OverviewMetricKey = 'plugins' | 'models' | 'adapters' | 'messages' | 'health'

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

/** Host / process facts for the 运行环境 card. Every field is optional; missing ones are hidden. */
export interface OverviewRuntime {
  /** How Shirobot runs, e.g. `docker`, `systemd`, `native` */
  mode?: string
  /** OS name and version, e.g. `Debian GNU/Linux 12 (bookworm)` */
  os?: string
  /** CPU architecture, e.g. `x64`, `arm64` */
  arch?: string
  /** Release tag of the running build, e.g. `v0.9.3` */
  version_tag?: string
  /** .NET runtime, e.g. `.NET 10.0.0` */
  framework?: string
  /** Process working set in bytes */
  memory_bytes?: number
  /** Managed (GC) heap in bytes */
  gc_heap_bytes?: number
  /** When the container image was built (ISO 8601); docker only */
  build_time?: string
}

export interface OverviewResponse {
  runtime?: OverviewRuntime
  bot_version: string
  /** Assembly ABI of the SDK loaded by the host, independent of its release version. */
  sdk_abi_version?: string
  uptime_seconds: number
  plugins_count: number
  models_count: number
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
