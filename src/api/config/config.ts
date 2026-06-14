import { apiRequest } from '../core/http'

export interface AppConfig {
  protocol: string
  enable_log: boolean
  disable_console_input: boolean
  avalonia_theme: string
  owner_list: number[]
  admin_list: number[]
  api: {
    enable: boolean
    listen_url: string
    token: string
  }
}

export interface AppConfigUpdateResponse {
  ok: boolean
  msg: string
}

export function getAppConfig() {
  return apiRequest<AppConfig>('/api/v1/config')
}

export function updateAppConfig(config: Partial<AppConfig>) {
  return apiRequest<AppConfigUpdateResponse>('/api/v1/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
}
