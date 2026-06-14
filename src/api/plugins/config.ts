import { apiRequest } from '../core/http'

export interface PluginConfigForm {
  alias: string
  logLevel: string
  debug: boolean
  autoLoad: boolean
  commandPrefix: string
  scope: string
  groupMessage: boolean
  privateMessage: boolean
  timeout: string
  concurrency: string
  rawConfig: string
}

export interface PluginPermissionConfig {
  key: string
  label: string
  description: string
  enabled: boolean
}

export interface PluginConfigResponse {
  pluginName: string
  form: PluginConfigForm
  permissions: PluginPermissionConfig[]
}

export function getPluginConfig(pluginId: string) {
  return apiRequest<PluginConfigResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/config`)
}

export function updatePluginConfig(pluginId: string, config: PluginConfigResponse) {
  return apiRequest<PluginConfigResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
}
