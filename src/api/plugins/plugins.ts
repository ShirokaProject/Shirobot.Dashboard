import type { Plugin } from '../../features/plugins/types'
import { apiRequest } from '../core/http'

export interface PluginUploadResponse {
  id?: string
  name?: string
  version?: string
  status?: 'pending' | 'parsed' | 'failed'
  message?: string
}

export function getInstalledPlugins() {
  return apiRequest<Plugin[]>('/api/v1/plugins')
}

export function setPluginEnabled(pluginId: string, enabled: boolean) {
  return apiRequest<Plugin>(`/api/v1/plugins/${encodeURIComponent(pluginId)}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
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
