import { apiBlobRequest, apiRequest } from '../core/http'
import type { PluginActionResponse } from './plugins'

export interface PluginPage {
  id: string; title: string; kind: string; icon?: string; description?: string; page_size: number
  columns: Array<{ key: string; label: string }>
  filters: Array<{ key: string; label: string; type: string; options: Array<{ value: string; label: string }> }>
  actions: Array<{ id: string; label: string; confirm?: string; tone: string }>
  upload?: { label: string; content_types: string[]; max_bytes: number; description?: string } | null
}
export interface PluginPageItem {
  id: string; title: string; description?: string; image?: string; tags: string[]; meta?: string
  values: Record<string, string>; actions: string[]
}
export interface PluginPageData {
  items: PluginPageItem[]; total?: number | null; has_more: boolean
  metrics: Array<{ label: string; value: string; hint?: string }>
}
export function pluginPagesPath(pluginId: string) {
  return `/api/v1/plugins/${encodeURIComponent(pluginId)}/pages`
}
export function pluginPagePath(pluginId: string, pageId: string) {
  return `${pluginPagesPath(pluginId)}/${encodeURIComponent(pageId)}`
}
export function getPluginPages(pluginId: string, signal?: AbortSignal) {
  return apiRequest<{ pages: PluginPage[] }>(pluginPagesPath(pluginId), { signal })
}
export function getPluginPageData(pluginId: string, pageId: string, page: number, pageSize: number,
  filters: Record<string, string>, signal?: AbortSignal) {
  const query = new URLSearchParams(filters)
  query.set('page', String(page)); query.set('page_size', String(pageSize))
  return apiRequest<PluginPageData>(`${pluginPagePath(pluginId, pageId)}/data?${query}`, { signal })
}
export function runPluginPageAction(pluginId: string, pageId: string, actionId: string, itemId: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ item: itemId })
  return apiRequest<PluginActionResponse>(`${pluginPagePath(pluginId, pageId)}/actions/${encodeURIComponent(actionId)}?${query}`,
    { method: 'POST', signal })
}
export function getPluginPageImage(pluginId: string, pageId: string, fileId: string, signal?: AbortSignal) {
  return apiBlobRequest(`${pluginPagePath(pluginId, pageId)}/files?${new URLSearchParams({ id: fileId })}`, { signal })
}

export function uploadPluginPageFile(pluginId: string, pageId: string, file: File, signal?: AbortSignal) {
  return apiRequest<PluginActionResponse>(`${pluginPagePath(pluginId, pageId)}/upload?${new URLSearchParams({ name: file.name })}`,
    { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file, signal })
}
