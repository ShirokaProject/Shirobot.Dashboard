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

export interface PluginActionResponse {
  ok: boolean
  message: string
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
  return apiRequest<PluginActionResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/${enabled ? 'enable' : 'disable'}`, {
    method: 'POST'
  })
}

export function deletePlugin(pluginId: string) {
  return apiRequest<PluginActionResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/delete`, {
    method: 'POST'
  })
}

export function updatePlugin(pluginId: string) {
  return apiRequest<PluginActionResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/update`, {
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
