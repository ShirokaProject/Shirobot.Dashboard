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
  path: string
}

interface AdapterOperationResponse {
  ok: boolean
  adapter: AdapterStatus
}

interface ModelOperationResponse {
  ok: boolean
  models: Array<ModelInfo | {
    id: string
    version: string
    assemblyName: string
    assemblyPath: string
  }>
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

export function reloadModels() {
  return apiRequest<ModelOperationResponse>('/api/v1/models/reload', { method: 'POST' })
}

export function installModel(file: File) {
  const body = new FormData()
  body.append('file', file)
  return apiRequest<ModelOperationResponse>('/api/v1/models/install', {
    method: 'POST',
    body
  })
}
