import { installedPluginSnapshot } from '../../features/plugins/updateCounts'
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
  /** The running version could not be hot-swapped; the new one is staged for the next start. */
  pending_restart?: boolean
  message?: string
}

export interface PluginUploadCancelResponse {
  success: boolean
}

export interface PluginStateChangeResponse {
  ok: boolean
  message: string
  /** A staged update or deletion will apply at the next start. */
  pending_restart?: boolean
  pending_delete?: boolean
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
    repo: plugin.repo,
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
  const normalized = plugins.map(normalizePlugin)
  installedPluginSnapshot.value = normalized
  return normalized
}

export function setPluginEnabled(pluginId: string, enabled: boolean) {
  return apiRequest<PluginStateChangeResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/${enabled ? 'enable' : 'disable'}`, {
    method: 'POST'
  })
}

export type PluginRouteMatch = 'exact' | 'prefix' | 'mention' | 'mention_all' | 'reply' | 'all' | 'custom'

export interface PluginMessageRoute {
  match: PluginRouteMatch | string
  pattern: string | null
  /** Mentioned user ID or replied message ID the route is limited to */
  argument: string | null
  description: string | null
}

export interface PluginEventRoute {
  type: string
  full_type: string | null
  platform_kind: string | null
  filtered: boolean
  description: string | null
}

/** What a loaded plugin listens to; reported by hosts with SDK ABI 1.3 or newer. */
export interface PluginListeners {
  group: PluginMessageRoute[]
  direct: PluginMessageRoute[]
  group_all_messages: boolean
  direct_all_messages: boolean
  events: PluginEventRoute[]
}

export interface PluginDashboardTabSource {
  path: string
  method?: string
}

export interface PluginDashboardTabFields {
  image?: string | null
  title?: string | null
  description?: string | null
  tags?: string | null
  meta?: string | null
}

export interface PluginDashboardTabColumn {
  key: string
  label: string
  type?: string
}

export interface PluginDashboardTabFilterOption {
  value: string
  label: string
}

export interface PluginDashboardTabFilter {
  key: string
  label: string
  type?: string
  options?: PluginDashboardTabFilterOption[] | null
}

export interface PluginDashboardTabPagination {
  page_param?: string
  page_size_param?: string
  page_size?: number
}

export interface PluginDashboardTabAction {
  id: string
  label: string
  path: string
  method?: string
  confirm?: string | null
  tone?: string
}

/** A plugin-declared tab rendered by a common dashboard renderer. */
export interface PluginDashboardTab {
  contract_version?: number
  id: string
  label: string
  kind: string
  icon?: string | null
  description?: string | null
  order?: number | null
  source?: PluginDashboardTabSource | null
  fields?: PluginDashboardTabFields | null
  columns?: PluginDashboardTabColumn[] | null
  filters?: PluginDashboardTabFilter[] | null
  pagination?: PluginDashboardTabPagination | null
  actions?: PluginDashboardTabAction[] | null
}

export interface PluginDetailResponse {
  id: string
  name: string
  version: string
  /** Null while the plugin is not loaded; absent on older hosts */
  listeners?: PluginListeners | null
  /** Absent on older hosts, or when the plugin declares no custom tabs */
  dashboard_tabs?: PluginDashboardTab[] | null
}

export function getPluginDetail(pluginId: string) {
  return apiRequest<PluginDetailResponse>(`/api/v1/plugins/${encodeURIComponent(pluginId)}`)
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
