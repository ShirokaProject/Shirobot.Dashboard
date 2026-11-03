import { requestPluginWebPage } from '../../api/plugins/pages'
import type { WebBridgeMessage } from './webBridge'

const MAX_TRANSFER = 1024 * 1024 * 1024
const requestHeaders = new Set(['content-type', 'content-language', 'content-range', 'accept', 'accept-language', 'range', 'if-range', 'if-match', 'if-none-match', 'if-modified-since', 'if-unmodified-since'])
const responseHeaders = new Set(['content-type', 'content-length', 'content-disposition', 'content-range', 'accept-ranges', 'etag', 'last-modified'])
export function pageRequestPath(value: string) {
  if (!value.startsWith('/') || value.startsWith('//') || /[\\#\u0000-\u001f\u007f]/.test(value)) throw new Error('只能请求当前页面内的相对路径。')
  const decoded = decodeURIComponent(value.split('?')[0]!)
  if (/[\\:%?#\u0000-\u001f\u007f]/.test(decoded) || decoded.includes('//') || decoded.split('/').some(p => p === '.' || p === '..'))
    throw new Error('页面内路径无效。')
  return value
}
export function pageRequestInit(data: WebBridgeMessage, signal: AbortSignal): RequestInit {
  const method = data.method?.toUpperCase() || 'GET'
  if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(method)) throw new Error('HTTP 方法不支持。')
  const headers = new Headers()
  for (const [name, value] of new Headers(data.headers)) {
    const key = name.toLowerCase()
    if (requestHeaders.has(key) || key.startsWith('x-') && !key.startsWith('x-forwarded-') && !/auth|token|key/.test(key)) headers.set(name, value)
  }
  let body: BodyInit | undefined
  if (data.body && typeof data.body === 'object' && !(data.body instanceof Blob) && 'form' in data.body) {
    if (!Array.isArray(data.body.form) || data.body.form.length > 1024) throw new Error('表单字段过多。')
    const form = new FormData(); let size = 0
    for (const [name, value] of data.body.form) {
      if (typeof name !== 'string' || name.length > 1024 || !(typeof value === 'string' || value instanceof Blob)) throw new Error('表单字段无效。')
      size += new TextEncoder().encode(name).length + (typeof value === 'string' ? new TextEncoder().encode(value).length : value.size) + 1024
      if (size > MAX_TRANSFER) throw new Error('请求体超过大小限制。')
      form.append(name, value)
    }
    body = form; headers.delete('Content-Type')
  } else if (typeof data.body === 'string' || data.body instanceof Blob) {
    body = data.body
    const size = typeof body === 'string' ? new TextEncoder().encode(body).length : body.size
    if (size > MAX_TRANSFER) throw new Error('请求体超过大小限制。')
  } else if (data.body != null) throw new Error('请求体类型无效。')
  if (body !== undefined && ['GET', 'HEAD'].includes(method)) throw new Error('GET/HEAD 不接受请求体。')
  return { method, headers, body, signal }
}

/** Response data is pulled one chunk at a time, transferred rather than buffered as one large postMessage. */
export async function serveWebRequest(pluginId: string, pageId: string, data: WebBridgeMessage, controller: AbortController,
  respond: (value: object, transfer?: Transferable[]) => void, release: () => void) {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined, port: MessagePort | undefined
  let finished = false, pulling = false, bytes = 0
  const finish = () => {
    if (finished) return
    finished = true; controller.signal.removeEventListener('abort', aborted)
    void reader?.cancel().catch(() => {}); port?.close(); release()
  }
  const aborted = () => { port?.postMessage({ error: '请求已取消。' }); finish() }
  controller.signal.addEventListener('abort', aborted, { once: true })
  try {
    const response = await requestPluginWebPage(pluginId, pageId, pageRequestPath(data.path!), pageRequestInit(data, controller.signal))
    if (controller.signal.aborted) { finish(); return }
    const headers = [...response.headers].filter(([name]) => responseHeaders.has(name) || name.startsWith('x-') && !/auth|token|key/.test(name))
    if (!response.body || data.method?.toUpperCase() === 'HEAD' || [204, 205, 304].includes(response.status)) {
      respond({ ok: true, value: { status: response.status, statusText: response.statusText, headers } }); finish(); return
    }
    if (response.status === 0) throw new Error('页面响应无效。')
    reader = response.body.getReader()
    const { port1, port2 } = new MessageChannel(); port = port1
    port1.onmessage = async ({ data: message }) => {
      if (message?.op === 'cancel') { controller.abort(); return }
      if (message?.op !== 'pull' || finished || pulling) return
      pulling = true
      try {
        const next = await reader!.read()
        if (finished) return
        if (next.done) { port1.postMessage({ done: true }); finish(); return }
        bytes += next.value.byteLength
        if (bytes > MAX_TRANSFER) throw new Error('响应体超过大小限制。')
        const chunk = next.value.buffer.slice(next.value.byteOffset, next.value.byteOffset + next.value.byteLength) as ArrayBuffer
        port1.postMessage({ chunk }, [chunk])
      } catch { if (!finished) port1.postMessage({ error: '读取响应流失败。' }); controller.abort(); finish() }
      finally { pulling = false }
    }
    port1.start()
    respond({ ok: true, value: { status: response.status, statusText: response.statusText, headers, port: port2 } }, [port2])
  } catch (error) { finish(); throw error }
}
