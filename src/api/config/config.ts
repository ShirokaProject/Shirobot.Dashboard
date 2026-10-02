import { apiRequest } from '../core/http'
import type { PluginConfigSchemaItem } from '../plugins/config'

export interface AppConfig {
  schema?: PluginConfigSchemaItem[]
  /** Legacy single adapter; superseded by `protocols`. */
  protocol?: string
  /** Adapters loaded at startup in addition to the enabled installed ones: ids, DLL names or paths. */
  protocols?: string[]
  enable_log: boolean
  showid?: boolean
  disable_console_input: boolean
  github_proxy: string
  host_update_repository: string
  avalonia_theme: string
  owner_list: number[]
  admin_list: number[]
  api: {
    enable: boolean
    listen_url: string
    listen_urls: string[]
    public_base_url: string | null
    auth_enable: boolean
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
