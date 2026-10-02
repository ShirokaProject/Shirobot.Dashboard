import { apiRequest } from '../core/http'
import type { PluginConfigSchemaItem } from '../plugins/config'

export type AppConfigData = Record<string, unknown>

export interface AppConfigResponse {
  schema: PluginConfigSchemaItem[]
  config: AppConfigData
}

export interface AppConfigUpdateResponse {
  ok: boolean
  msg: string
}

export function getAppConfig() {
  return apiRequest<AppConfigResponse>('/api/v1/config')
}

export function updateAppConfig(config: AppConfigData) {
  return apiRequest<AppConfigUpdateResponse>('/api/v1/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  })
}
