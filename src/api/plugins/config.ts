import { apiRequest } from '../core/http'

export type PluginConfigValue = string | number | boolean | null | PluginConfigValue[]
export type PluginConfigMap = Record<string, PluginConfigValue>

export interface PluginConfigSchemaItem {
  key: string
  label: string
  type: string
  description: string
  placeholder?: string | null
  options: string[]
  min?: number | null
  max?: number | null
}

export interface PluginRoutesConfig {
  configured: boolean
  mode: 'default' | 'blacklist' | 'whitelist' | string
  groups: string[]
  effective_mode: 'blacklist' | 'whitelist' | string
  effective_groups: string[]
  default_mode: 'blacklist' | 'whitelist' | string
  default_groups: string[]
}

export interface PluginConfigResponse {
  plugin_id: string
  config: PluginConfigMap
  schema?: PluginConfigSchemaItem[]
  routes: PluginRoutesConfig
}

export interface PluginConfigUpdateRequest {
  config?: PluginConfigMap
  routes?: {
    mode: string
    groups: string[]
  }
}

export interface PluginConfigUpdateResponse {
  ok?: boolean
  plugin_id?: string
  config?: PluginConfigMap
  schema?: PluginConfigSchemaItem[]
  routes?: PluginRoutesConfig
}

export function getPluginConfig(pluginId: string) {
  return apiRequest<PluginConfigResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/config`)
}

export function updatePluginConfig(pluginId: string, config: PluginConfigUpdateRequest) {
  return apiRequest<PluginConfigUpdateResponse | null>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
}
