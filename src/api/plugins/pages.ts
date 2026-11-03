import { apiBlobRequest, apiPluginResponse, apiRequest } from '../core/http'
import type { PluginActionResponse } from './plugins'

/** Component pages have no kind; custom sandbox pages use 'web'. Other kinds are legacy layouts. */
export interface PluginPage {
  id: string; title: string; icon?: string; description?: string; kind?: string
  /** Web pages: operations the Dashboard confirms before forwarding, keyed by action or "METHOD /path". */
  confirmations?: Record<string, string> | null
  /** Web pages: enforce Trusted Types inside the sandbox. */
  strict_dom?: boolean | null
}
export interface LegacyPluginPage extends PluginPage {
  kind: string; page_size: number
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

export function getPluginWebPage(pluginId: string, pageId: string, signal?: AbortSignal) {
  return apiRequest<{ html: string }>(`${pluginPagePath(pluginId, pageId)}/web`, { signal })
}
export function callPluginWebPage(pluginId: string, pageId: string, action: string, args: unknown, signal?: AbortSignal) {
  return apiRequest<{ value: unknown }>(`${pluginPagePath(pluginId, pageId)}/web/call`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, arguments: args }), signal
  })
}
export function getPluginWebAsset(pluginId: string, pageId: string, path: string, signal?: AbortSignal) {
  return apiBlobRequest(`${pluginPagePath(pluginId, pageId)}/web/assets?${new URLSearchParams({ path })}`, { signal })
}
export function requestPluginWebPage(pluginId: string, pageId: string, path: string, init?: RequestInit) {
  return apiPluginResponse(`${pluginPagePath(pluginId, pageId)}/web/request?${new URLSearchParams({ path })}`, init)
}

export function uploadPluginPageFile(pluginId: string, pageId: string, file: File, signal?: AbortSignal) {
  return apiRequest<PluginActionResponse>(`${pluginPagePath(pluginId, pageId)}/upload?${new URLSearchParams({ name: file.name })}`,
    { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file, signal })
}

export interface UiField {
  key: string; label: string; kind: string; required?: boolean; max_length?: number; min?: number; max?: number
  integer?: boolean; pattern?: string; description?: string; value?: unknown; options?: Array<{ value: string; label: string }>
}
export interface UiNode {
  type: string; id?: string; title?: string; text?: string; label?: string; value?: string; hint?: string; tone?: string
  markdown?: boolean; file?: string; alt?: string; url?: string; page?: string; confirm?: string; danger?: boolean
  children?: UiNode[]; tabs?: Array<{ id: string; title: string; children: UiNode[] }>
  columns?: string[]; actions?: Array<{ id: string; label: string; confirm?: string; danger?: boolean }>
  rows?: Array<{ key: string; cells: string[]; card?: { title: string; description?: string; image?: string; tags: string[]; meta?: string }; actions: string[] }>
  filters?: Array<{ key: string; label: string; kind: string; options: Array<{ value: string; label: string }> }>
  total?: number; page_size?: number; has_more?: boolean; accept?: string[]; max_bytes?: number
  fields?: UiField[]; dialog?: boolean; submit_label?: string
}
export type PageState = Record<string, string>
export interface PageEvent { kind: 'click' | 'action' | 'submit'; element: string; action?: string; item?: string; values?: Record<string, unknown> }
export interface PageView { view: UiNode | null; state: PageState }
export interface PageEventResponse extends PageView {
  result: { ok: boolean; message?: string; details?: string; details_title?: string
    open_page?: { id: string; state: PageState }; open_form?: { id: string; values?: Record<string, unknown> } }
}
export function renderPluginPage(pluginId: string, pageId: string, state: PageState, signal?: AbortSignal) {
  return apiRequest<PageView>(`${pluginPagePath(pluginId, pageId)}/render`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state }), signal })
}
export function sendPluginPageEvent(pluginId: string, pageId: string, state: PageState, event: PageEvent, signal?: AbortSignal) {
  return apiRequest<PageEventResponse>(`${pluginPagePath(pluginId, pageId)}/events`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state, event }), signal })
}
export function uploadPluginPageElement(pluginId: string, pageId: string, state: PageState, element: string, file: File, signal?: AbortSignal) {
  const query = new URLSearchParams({ name: file.name, element, state: JSON.stringify(state) })
  return apiRequest<PageEventResponse>(`${pluginPagePath(pluginId, pageId)}/upload?${query}`,
    { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file, signal })
}
