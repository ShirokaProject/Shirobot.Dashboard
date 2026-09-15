import { apiRequest } from '../core/http'

export interface AdapterStatus {
  loaded: boolean
  id: string | null
  name: string | null
  version: string | null
  platform: string | null
  assembly_path: string | null
}

export interface ModelInfo {
  id: string
  version: string
  assembly: string
  path: string | null
  source: 'built_in'
  reloadable: false
}

interface AdapterOperationResponse {
  ok: boolean
  adapter: AdapterStatus
}

export function getAdapterStatus() {
  return apiRequest<AdapterStatus>('/api/v1/adapter')
}

export function reloadAdapter(assemblyPath?: string) {
  return apiRequest<AdapterOperationResponse>('/api/v1/adapter/reload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assemblyPath?.trim() ? { assembly_path: assemblyPath.trim() } : {})
  })
}

export function stopAdapter() {
  return apiRequest<AdapterOperationResponse>('/api/v1/adapter/stop', { method: 'POST' })
}

export function getModels() {
  return apiRequest<ModelInfo[]>('/api/v1/models/list')
}
