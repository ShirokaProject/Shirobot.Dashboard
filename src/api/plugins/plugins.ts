import type { Plugin } from '../../features/plugins/types'
import { apiRequest } from '../core/http'

export interface PluginUploadPackageInfo {
  file_name: string
  type: 'dll' | 'zip' | string
  size: number
}

export interface PluginUploadConflictInfo {
  exists: boolean
  installed_version?: string
  uploaded_version?: string
  action?: 'replace' | string
}

export interface PluginUploadParsedResponse {
  upload_id: string
  status: 'parsed'
  source?: {
    type: string
    repository: string
    release_name: string
    release_version: string
    release_url: string
    asset_name: string
    asset_type: string
  }
  plugin: BackendPlugin
  package: PluginUploadPackageInfo
  conflict?: PluginUploadConflictInfo | null
}

export interface PluginUploadErrorResponse {
  error: string
  message: string
}

export type PluginUploadResponse = PluginUploadParsedResponse | PluginUploadErrorResponse

export interface PluginUploadConfirmRequest {
  replace: boolean
  enable: boolean
}

export interface PluginUploadConfirmResponse {
  success: boolean
  plugin: Pick<BackendPlugin, 'id'> & { enable: boolean }
}

export interface PluginUploadCancelResponse {
  success: boolean
}

export interface PluginStateChangeResponse {
  ok: boolean
  message: string
}

export interface PluginActionDefinition {
  id: string
  label: string
  description: string | null
  tone: string
  requires_confirmation: boolean
  confirmation_text: string | null
}

export interface PluginActionsResponse {
  actions: PluginActionDefinition[]
}

export interface PluginActionResponse {
  ok: boolean
  message: string
  refresh: boolean
}

export interface GithubPluginInstallRequest {
  repository: string
  includePrerelease: false
  assetUrl: string
  assetName: string
  assetSha256: string
}

export interface BackendPlugin {
  id: string
  name: string
  version: string
  enable?: boolean
  author?: string
  repo?: string
  description?: string
  category?: string
  status?: Plugin['status']
  latestVersion?: string
  hasUpdate?: boolean
  errorMessage?: string
  permissions?: string[]
  history?: Array<{ version: string; date: string }>
}

function normalizePlugin(plugin: BackendPlugin): Plugin {
  const status = plugin.status ?? (plugin.enable ? 'enabled' : 'disabled')

  return {
    id: plugin.id,
    name: plugin.name,
    author: plugin.author || 'Unknown',
    version: plugin.version,
    latestVersion: plugin.latestVersion ?? plugin.version,
    status,
    hasUpdate: plugin.hasUpdate ?? false,
    category: plugin.category || 'Other',
    description: plugin.description || '',
    errorMessage: plugin.errorMessage,
    permissions: plugin.permissions ?? [],
    history: plugin.history ?? [{ version: plugin.version, date: '-' }]
  }
}

export async function getInstalledPlugins() {
  const plugins = await apiRequest<BackendPlugin[]>('/api/v1/plugins/list')
  return plugins.map(normalizePlugin)
}

export function setPluginEnabled(pluginId: string, enabled: boolean) {
  return apiRequest<PluginStateChangeResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/${enabled ? 'enable' : 'disable'}`, {
    method: 'POST'
  })
}

export function getPluginActions(pluginId: string) {
  return apiRequest<PluginActionsResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/actions`)
}

export function runPluginAction(pluginId: string, actionId: string) {
  return apiRequest<PluginActionResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/actions/${encodeURIComponent(actionId)}`, {
    method: 'POST'
  })
}

export function updateInstalledPlugin(pluginId: string) {
  return apiRequest<PluginStateChangeResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/update`, {
    method: 'POST'
  })
}

export function deleteInstalledPlugin(pluginId: string) {
  return apiRequest<PluginStateChangeResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/delete`, {
    method: 'POST'
  })
}

export function uploadPluginPackage(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return apiRequest<PluginUploadResponse>('/api/v1/plugins/upload', {
    method: 'POST',
    body: formData
  })
}

export function prepareGithubPluginInstall(
  repository: string,
  asset: { url: string; name: string; digest: string }
) {
  const request: GithubPluginInstallRequest = {
    repository,
    includePrerelease: false,
    assetUrl: asset.url,
    assetName: asset.name,
    assetSha256: asset.digest
  }

  return apiRequest<PluginUploadParsedResponse>('/api/v1/plugins/install/github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
}

export function confirmPluginUpload(uploadId: string, request: PluginUploadConfirmRequest) {
  return apiRequest<PluginUploadConfirmResponse>(`/api/v1/plugins/upload/${encodeURIComponent(uploadId)}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
}

export function cancelPluginUpload(uploadId: string) {
  return apiRequest<PluginUploadCancelResponse>(`/api/v1/plugins/upload/${encodeURIComponent(uploadId)}`, {
    method: 'DELETE'
  })
}
