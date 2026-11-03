import { callPluginWebPage, getPluginWebAsset } from '../../api/plugins/pages'
import { getApiErrorMessage } from '../../api/core/http'
import { validWebBridgeMessage, webPageConfirmation } from './webBridge'
import { serveWebRequest } from './webRequest'

/** Parent-side services the bridge uses; tests replace them. */
export interface WebBridgeServices {
  call: typeof callPluginWebPage
  asset: typeof getPluginWebAsset
  request: typeof serveWebRequest
  /** Shown by the Dashboard, outside the sandbox, so page scripts can neither draw nor dismiss it. */
  confirm: (text: string) => boolean
}

export interface WebBridgeHostOptions {
  pluginId: string; pageId: string; title: string
  confirmations?: Record<string, string> | null
  /** The nonce embedded in this document's bootstrap; the first message must prove it. */
  nonce: string
  /** Aborted when the page is refreshed, switched or closed. */
  signal: AbortSignal
  post: (message: object, transfer?: Transferable[]) => void
  close: () => void
  services?: Partial<WebBridgeServices>
}

const defaults: WebBridgeServices = {
  call: callPluginWebPage, asset: getPluginWebAsset, request: serveWebRequest,
  confirm: text => window.confirm(text)
}

/** Handles messages arriving on the page's MessagePort: authenticates the document, then serves bounded bridge calls. */
export function createWebBridgeHost(options: WebBridgeHostOptions) {
  const { pluginId, pageId, title, confirmations, nonce, signal, post, close } = options
  const services = { ...defaults, ...options.services }
  const inFlight = new Set<number>()
  const transfers = new Map<number, AbortController>()
  let authenticated = false
  return async (data: unknown) => {
    if (!authenticated) {
      if (data && typeof data === 'object' && 'type' in data && data.type === 'ready' && 'nonce' in data && data.nonce === nonce)
        authenticated = true
      else close()
      return
    }
    if (!validWebBridgeMessage(data) || signal.aborted) return
    if (data.op === 'cancel') { transfers.get(data.id)?.abort(); return }
    if (inFlight.has(data.id) || transfers.has(data.id)) return
    const respond = (message: object, transfer: Transferable[] = []) => {
      if (!signal.aborted) post({ id: data.id, ...message }, transfer)
    }
    if (inFlight.size + transfers.size >= 32) { respond({ ok: false, error: '同时进行的网页请求过多。' }); return }
    // Declared dangerous operations are confirmed here, outside the sandbox.
    const confirmation = webPageConfirmation(confirmations, data)
    if (confirmation !== null && !services.confirm(`「${title}」请求执行操作：\n\n${confirmation}`)) {
      respond({ ok: false, error: '已取消。' }); return
    }
    if (data.op === 'request') {
      const transfer = new AbortController()
      const abort = () => transfer.abort()
      signal.addEventListener('abort', abort, { once: true }); transfers.set(data.id, transfer)
      try {
        await services.request(pluginId, pageId, data, transfer, respond,
          () => { transfers.delete(data.id); signal.removeEventListener('abort', abort) })
      } catch (cause) { respond({ ok: false, error: getApiErrorMessage(cause, '网页请求失败。') }) }
      return
    }
    inFlight.add(data.id)
    try {
      if (data.op === 'call') {
        const json = JSON.stringify(data.arguments ?? null)
        if (new TextEncoder().encode(json).length > 900000) throw new Error('网页请求超过大小限制。')
        const result = await services.call(pluginId, pageId, data.action!, data.arguments ?? null, signal)
        respond({ ok: true, value: result.value })
      } else {
        const asset = await services.asset(pluginId, pageId, data.path!, signal)
        const bytes = await asset.arrayBuffer()
        respond({ ok: true, value: { bytes, contentType: asset.type } }, [bytes])
      }
    } catch (cause) { respond({ ok: false, error: getApiErrorMessage(cause, '网页操作失败。') }) }
    finally { inFlight.delete(data.id) }
  }
}
