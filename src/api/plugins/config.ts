import { apiRequest } from '../core/http'

export type PluginConfigValue = string | number | boolean | null | Array<string | number>
export type PluginConfigMap = Record<string, PluginConfigValue>

export interface PluginConfigSchemaItem {
  key: string
  label: string
  type: 'string' | 'text' | 'number' | 'boolean' | 'select' | string
  description?: string | null
  placeholder?: string | null
  options?: Array<string | number>
  min?: number | null
  max?: number | null
}

export interface PluginRoutesConfig {
  configured: boolean
  mode: 'default' | 'blacklist' | 'whitelist' | string
  groups: number[]
  effective_mode: 'blacklist' | 'whitelist' | string
  effective_groups: number[]
  default_mode: 'blacklist' | 'whitelist' | string
  default_groups: number[]
}

export interface PluginConfigResponse {
  plugin_id: string
  config: PluginConfigMap
  schema: PluginConfigSchemaItem[]
  routes: PluginRoutesConfig
}

export interface PluginConfigUpdateRequest {
  config: PluginConfigMap
  routes: {
    mode: string
    groups: number[]
  }
}

export function getPluginConfig(pluginId: string) {
  return apiRequest<PluginConfigResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/config`)
}

export function updatePluginConfig(pluginId: string, config: PluginConfigUpdateRequest) {
  return apiRequest<PluginConfigResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
}
