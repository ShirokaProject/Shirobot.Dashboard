import { adapterMarketSnapshot } from '../../features/plugins/updateCounts'
import { apiRequest } from '../core/http'
import type { ConfigApplyStatus, PluginConfigMap, PluginConfigSchemaItem } from '../plugins/config'

const PLATFORM_LABELS: Record<string, string> = {
  qq: 'QQ',
  tg: 'Telegram',
  telegram: 'Telegram',
  wechat: '微信',
  wx: '微信',
  discord: 'Discord',
  kook: 'KOOK',
  onebot: 'OneBot',
  github: 'GitHub',
  slack: 'Slack',
  line: 'LINE',
  dingtalk: '钉钉',
  feishu: '飞书',
  lark: '飞书',
}

/** Platform ids arrive lowercase ("qq", "telegram"); show them with their proper brand casing. */
export function formatPlatform(value: string): string {
  const key = value.trim().toLowerCase()
  return PLATFORM_LABELS[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : value)
}

export interface AdapterStatus {
  id: string
  packageId?: string
  configPath?: string | null
  name: string
  version: string
  platform: string
  /** Whether the adapter is configured to start with the host. */
  enabled?: boolean
  loaded: boolean
  assemblyPath: string | null
  description: string
  error: string | null
  restartRequired: boolean
  rollback: string | null
}

export interface AdapterInstallPreview {
  uploadId: string
  adapter: AdapterStatus
  packageName: string
  packageType: string
  packageSize: number | null
  conflict: boolean
  installedVersion: string | null
  source: string | null
}

export interface AdapterOperationResponse {
  ok: boolean
  message: string
  adapter?: AdapterStatus
  restartRequired: boolean
  rollback: string | null
}

export interface AdapterMarketEntry {
  id: string
  name: string
  version: string
  platform: string
  description: string
  repository: string
  authors: string[]
  downloadCount: number | null
  installedVersion: string | null
  health: string
  /** Why the entry isn't installable, when the backend explains it */
  healthMessage?: string
  asset?: { url: string; name: string; digest?: string; size?: number }
}

export interface AdapterConfigResponse {
  adapter_id?: string
  config: PluginConfigMap
  schema?: PluginConfigSchemaItem[]
  apply_status?: ConfigApplyStatus
}

export interface ModelInfo {
  id: string
  version: string
  assembly: string
  path: string | null
  source: 'built_in'
  reloadable: false
}

type ApiRecord = Record<string, unknown>

function record(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? value as ApiRecord : {}
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeAdapter(value: unknown): AdapterStatus {
  const item = record(value)
  return {
    id: stringValue(item.id || item.adapter_id),
    packageId: stringValue(item.package_id || item.packageId || item.id || item.adapter_id),
    configPath: stringValue(item.config_path || item.configPath) || null,
    name: stringValue(item.name || item.display_name || item.id || item.adapter_id, '未命名适配器'),
    version: stringValue(item.version, '—'),
    platform: formatPlatform(stringValue(item.platform || item.platform_id, '未声明')),
    enabled: booleanValue(item.enabled, booleanValue(item.loaded ?? item.running ?? item.is_loaded)),
    loaded: booleanValue(item.loaded ?? item.running ?? item.is_loaded),
    assemblyPath: stringValue(item.assemblyPath || item.assembly_path || item.path) || null,
    description: stringValue(item.description),
    error: stringValue(item.error || item.error_message) || null,
    restartRequired: booleanValue(item.restartRequired ?? item.restart_required),
    rollback: stringValue(item.rollback || item.rollback_status) || null
  }
}

function normalizeOperation(value: unknown): AdapterOperationResponse {
  const response = record(value)
  const adapterValue = response.adapter ?? response.item
  return {
    ok: booleanValue(response.ok ?? response.success, true),
    message: stringValue(response.message || response.msg),
    adapter: adapterValue ? normalizeAdapter(adapterValue) : undefined,
    // pending_restart: the new version is staged and replaces the running one at the next start.
    restartRequired: booleanValue(response.restartRequired ?? response.restart_required ?? response.pending_restart),
    rollback: stringValue(response.rollback || response.rollback_status) || null
  }
}

function normalizePreview(value: unknown): AdapterInstallPreview {
  const response = record(value)
  const packageInfo = record(response.package)
  const conflict = record(response.conflict)
  return {
    uploadId: stringValue(response.uploadId || response.upload_id || response.id),
    adapter: normalizeAdapter(response.adapter ?? response.item),
    packageName: stringValue(packageInfo.file_name || packageInfo.fileName || response.file_name),
    packageType: stringValue(packageInfo.type || response.package_type, 'package'),
    packageSize: typeof (packageInfo.size ?? response.package_size) === 'number' ? Number(packageInfo.size ?? response.package_size) : null,
    conflict: booleanValue(conflict.exists ?? response.conflict),
    installedVersion: stringValue(conflict.installed_version || conflict.installedVersion) || null,
    source: stringValue(record(response.source).type || response.source_type) || null
  }
}

export async function getAdapters() {
  const response = await apiRequest<unknown>('/api/v1/adapters')
  const items = Array.isArray(response) ? response : record(response).adapters
  return Array.isArray(items) ? items.map(normalizeAdapter) : []
}

export async function getAdapterPackages() {
  const response = await apiRequest<unknown>('/api/v1/adapter-packages')
  return Array.isArray(response) ? response.map(normalizeAdapter) : []
}

/** Package master switch and reload: act on every instance of the package at once. */
export async function runAdapterPackage(id: string, action: 'start' | 'stop' | 'reload') {
  return normalizeOperation(await apiRequest<unknown>(`/api/v1/adapter-packages/${encodeURIComponent(id)}/${action}`, { method: 'POST' }))
}

export async function deleteAdapterPackage(id: string) {
  return normalizeOperation(await apiRequest<unknown>(`/api/v1/adapter-packages/${encodeURIComponent(id)}`, { method: 'DELETE' }))
}

export async function getAdapterStatus() {
  return normalizeAdapter(await apiRequest<unknown>('/api/v1/adapter'))
}

export async function startAdapter(id: string) {
  return normalizeOperation(await apiRequest<unknown>(`/api/v1/adapters/${encodeURIComponent(id)}/start`, { method: 'POST' }))
}

export async function stopAdapterById(id: string) {
  return normalizeOperation(await apiRequest<unknown>(`/api/v1/adapters/${encodeURIComponent(id)}/stop`, { method: 'POST' }))
}

export async function reloadAdapterById(id: string) {
  return normalizeOperation(await apiRequest<unknown>(`/api/v1/adapters/${encodeURIComponent(id)}/reload`, { method: 'POST' }))
}

export async function createAdapterInstance(packageId: string, id: string, name: string) {
  return normalizeOperation(await apiRequest<unknown>(`/api/v1/adapters/${encodeURIComponent(packageId)}/instances`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name })
  }))
}

export async function updateAdapterInstance(id: string, newId: string, name: string) {
  return normalizeOperation(await apiRequest<unknown>(`/api/v1/adapters/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: newId, name })
  }))
}

export async function deleteAdapter(id: string) {
  return normalizeOperation(await apiRequest<unknown>(`/api/v1/adapters/${encodeURIComponent(id)}`, { method: 'DELETE' }))
}

export async function uploadAdapterPackage(file: File) {
  const body = new FormData()
  body.append('file', file)
  return normalizePreview(await apiRequest<unknown>('/api/v1/adapters/upload', { method: 'POST', body }))
}

export async function prepareGithubAdapterInstall(repository: string, asset?: AdapterMarketEntry['asset']) {
  return normalizePreview(await apiRequest<unknown>('/api/v1/adapters/install/github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repository, assetUrl: asset?.url, assetName: asset?.name, assetSha256: asset?.digest })
  }))
}

export async function confirmAdapterUpload(uploadId: string, replace: boolean) {
  return normalizeOperation(await apiRequest<unknown>(`/api/v1/adapters/upload/${encodeURIComponent(uploadId)}/confirm`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ replace })
  }))
}

export function cancelAdapterUpload(uploadId: string) {
  return apiRequest<unknown>(`/api/v1/adapters/upload/${encodeURIComponent(uploadId)}`, { method: 'DELETE' })
}

function normalizeMarketEntry(value: unknown): AdapterMarketEntry {
  const item = record(value)
  const release = record(item.release)
  const asset = record(item.asset ?? release.asset)
  return {
    id: stringValue(item.id), name: stringValue(item.name || item.id), version: stringValue(item.version || release.version, '—'),
    platform: formatPlatform(stringValue(item.platform || item.category, '未声明')), description: stringValue(item.description), repository: stringValue(item.repository),
    authors: Array.isArray(item.authors) ? item.authors.map(author => stringValue(record(author).name || author)).filter(Boolean) : [stringValue(item.author)].filter(Boolean),
    downloadCount: typeof (item.downloadCount ?? item.download_count ?? release.downloadCount) === 'number' ? Number(item.downloadCount ?? item.download_count ?? release.downloadCount) : null,
    installedVersion: stringValue(record(item.installed).version || item.installed_version) || null,
    health: stringValue(record(item.health).status || item.health, 'unknown'),
    healthMessage: stringValue(record(item.health).message || item.health_message) || undefined,
    asset: Object.keys(asset).length ? { url: stringValue(asset.url), name: stringValue(asset.name), digest: stringValue(asset.digest) || undefined, size: typeof asset.size === 'number' ? asset.size : undefined } : undefined
  }
}

/**
 * @param source '' for the backend's default (official) catalog, otherwise a third-party
 *   `owner/repo` or catalog URL, forwarded as `?source=`.
 */
export async function getAdapterMarketAdapters(forceRefresh = false, source = '') {
  const params = new URLSearchParams()
  if (source) params.set('source', source)
  if (forceRefresh) params.set('refresh', '1')
  const query = params.toString()
  const response = await apiRequest<unknown>(`/api/v1/adapter-market/adapters${query ? `?${query}` : ''}`)
  const entries = Array.isArray(response) ? response : record(response).adapters
  const normalized = (Array.isArray(entries) ? entries : []).map(normalizeMarketEntry)
  if (!source) adapterMarketSnapshot.value = normalized
  return normalized
}

/**
 * Resolve one adapter repository (GitHub, Gitea, …) outside any catalog. The backend checks
 * it against the Shirobot release rules; `health` is not `available` when it doesn't qualify.
 */
export async function resolveRepositoryAdapter(repository: string) {
  return normalizeMarketEntry(await apiRequest<unknown>(`/api/v1/adapter-market/resolve?repository=${encodeURIComponent(repository)}`))
}

/** Adapter settings share the plugin config shape; `routes` does not apply to adapters. */
export function getAdapterConfig(adapterId: string) {
  return apiRequest<AdapterConfigResponse>(`/api/v1/adapters/${encodeURIComponent(adapterId)}/config`)
}

export function updateAdapterConfig(adapterId: string, config: PluginConfigMap) {
  return apiRequest<AdapterConfigResponse | null>(`/api/v1/adapters/${encodeURIComponent(adapterId)}/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config })
  })
}

// Legacy host endpoints remain available for older backends and the existing overview flow.
export function reloadAdapter(assemblyPath?: string) {
  return apiRequest<AdapterOperationResponse>('/api/v1/adapter/reload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(assemblyPath?.trim() ? { assembly_path: assemblyPath.trim() } : {}) })
}

export function stopAdapter() {
  return apiRequest<AdapterOperationResponse>('/api/v1/adapter/stop', { method: 'POST' })
}

export function getModels() {
  return apiRequest<ModelInfo[]>('/api/v1/models/list')
}
