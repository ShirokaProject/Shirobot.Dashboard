import { apiRequest } from '../core/http'

export interface AppConfig {
  name: string
  debug: boolean
  logLevel: string
  port: string
  workdir: string
  hotReload: boolean
  remoteAdmin: boolean
  admins: string
}

export function getAppConfig() {
  return apiRequest<AppConfig>('/api/config')
}

export function updateAppConfig(config: AppConfig) {
  return apiRequest<AppConfig>('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
}
