import { apiRequest } from '../core/http'

export type PluginConfigValue = string | number | boolean | null | Array<string | number>
export type PluginConfigMap = Record<string, PluginConfigValue>

export type ConfigConditionEffect = 'visible' | 'enabled'
export type ConfigConditionOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
export type ConfigApplyStatus = 'applied' | 'pending_start' | 'legacy_saved_only' | 'loaded'

export interface PluginConfigCondition {
  effect: ConfigConditionEffect
  /** Config key in snake_case, matching schema[].key. */
  field: string
  operator: ConfigConditionOperator
  /** Invariant string form; numeric operators parse it as a number. */
  value: string
}

export interface PluginConfigSchemaItem {
  key: string
  label: string
  type: 'string' | 'text' | 'number' | 'boolean' | 'select' | string
  description?: string | null
  placeholder?: string | null
  options?: Array<string | number>
  min?: number | null
  max?: number | null
  /** Optional category from the plugin; the config UI groups fields by it when present. */
  group?: string | null
  /** Stable category identifier; `group` remains the display-label compatibility field. */
  group_id?: string | null
  group_label?: string | null
  order?: number | null
  group_order?: number | null
  conditions?: PluginConfigCondition[] | null
  default_value?: PluginConfigValue | Record<string, unknown>
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
  schema?: PluginConfigSchemaItem[]
  routes: PluginRoutesConfig
  config_apply_status?: ConfigApplyStatus
}

export interface PluginConfigUpdateRequest {
  config?: PluginConfigMap
  routes?: {
    mode: string
    groups: number[]
  }
}

export interface PluginConfigUpdateResponse {
  ok?: boolean
  plugin_id?: string
  config?: PluginConfigMap
  schema?: PluginConfigSchemaItem[]
  routes?: PluginRoutesConfig
  config_apply_status?: ConfigApplyStatus
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
