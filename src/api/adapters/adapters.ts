import { apiRequest } from '../core/http'

export interface AdapterStatus {
  id: string
  name: string
  version: string
  platform: string
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
  asset?: { url: string; name: string; digest?: string; size?: number }
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
    name: stringValue(item.name || item.display_name || item.id || item.adapter_id, '未命名 Adapter'),
    version: stringValue(item.version, '—'),
    platform: stringValue(item.platform || item.platform_id, '未声明'),
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
    restartRequired: booleanValue(response.restartRequired ?? response.restart_required),
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

export async function getAdapterMarketAdapters() {
  const response = await apiRequest<unknown>('/api/v1/adapter-market/adapters')
  const entries = Array.isArray(response) ? response : record(response).adapters
  return (Array.isArray(entries) ? entries : []).map(value => {
    const item = record(value)
    const release = record(item.release)
    const asset = record(item.asset ?? release.asset)
    return {
      id: stringValue(item.id), name: stringValue(item.name || item.id), version: stringValue(item.version || release.version, '—'),
      platform: stringValue(item.platform || item.category, '未声明'), description: stringValue(item.description), repository: stringValue(item.repository),
      authors: Array.isArray(item.authors) ? item.authors.map(author => stringValue(record(author).name || author)).filter(Boolean) : [stringValue(item.author)].filter(Boolean),
      downloadCount: typeof (item.downloadCount ?? item.download_count ?? release.downloadCount) === 'number' ? Number(item.downloadCount ?? item.download_count ?? release.downloadCount) : null,
      installedVersion: stringValue(record(item.installed).version || item.installed_version) || null,
      health: stringValue(record(item.health).status || item.health, 'unknown'),
      asset: Object.keys(asset).length ? { url: stringValue(asset.url), name: stringValue(asset.name), digest: stringValue(asset.digest) || undefined, size: typeof asset.size === 'number' ? asset.size : undefined } : undefined
    }
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
