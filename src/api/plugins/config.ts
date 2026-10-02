import { apiRequest } from '../core/http'

export type PluginConfigValue =
  | string
  | number
  | boolean
  | null
  | PluginConfigValue[]
  | { [key: string]: PluginConfigValue }
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
  /**
   * Editor type. Besides scalars: `section` is a nested config object described by `fields`,
   * `object` a free-form table, `array` a list whose elements are described by `item_type`.
   */
  type: 'string' | 'text' | 'number' | 'integer' | 'boolean' | 'select' | 'section' | 'object' | 'array' | string
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
  /** Fields of a `section`; their keys are relative to this item. */
  fields?: PluginConfigSchemaItem[] | null
  /** Element type of an `array`: boolean, integer, number, string, section or object. */
  item_type?: string | null
  /** Fields of each element when `item_type` is `section`. */
  item_fields?: PluginConfigSchemaItem[] | null
}

export interface PluginRoutesConfig {
  configured: boolean
  mode: 'default' | 'blacklist' | 'whitelist' | string
  /** Group IDs as strings: not every platform uses numeric IDs */
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
  config_apply_status?: ConfigApplyStatus
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
