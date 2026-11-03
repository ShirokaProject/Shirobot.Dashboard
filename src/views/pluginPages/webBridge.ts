/** Runs inside the opaque-origin sandbox. It receives a page-scoped MessagePort, never credentials. */
export const WEB_BOOTSTRAP = String.raw`
(() => {
  let port, sequence = 0;
  const pending = new Map(), urls = new Set();
  let connected;
  const ready = new Promise(resolve => { connected = resolve; });
  window.addEventListener('message', function init(event) {
    if (event.source !== parent || event.data?.type !== 'shirobot-web-init' || !event.ports[0] || port) return;
    port = event.ports[0];
    window.removeEventListener('message', init);
    port.onmessage = ({ data }) => {
      const request = pending.get(data?.id);
      if (!request) return;
      pending.delete(data.id);
      if (data.ok) request.resolve(data.value);
      else request.reject(new Error(data.error || '页面操作失败。'));
    };
    port.start(); port.postMessage({ type: 'ready', nonce: /*SESSION*/ }); connected();
  });
  async function rpc(op, payload, signal) {
    if (pending.size >= 32) throw new Error('同时进行的网页请求过多。');
    if (signal?.aborted) throw new DOMException('请求已取消', 'AbortError');
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const abort = () => {
        pending.delete(id); ready.then(() => port.postMessage({ id, op: 'cancel' }));
        reject(new DOMException('请求已取消', 'AbortError'));
      };
      const finish = fn => value => { signal?.removeEventListener('abort', abort); fn(value); };
      pending.set(id, { resolve: finish(resolve), reject: finish(reject) });
      signal?.addEventListener('abort', abort, { once: true });
      ready.then(() => { if (pending.has(id)) port.postMessage({ id, op, ...payload }); });
    });
  }
  async function httpRequest(path, init = {}) {
    let body = init.body ?? null;
    if (body instanceof FormData) body = { form: [...body.entries()] };
    else if (body instanceof URLSearchParams) {
      const headers = new Headers(init.headers);
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
      init = { ...init, headers }; body = body.toString();
    } else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) body = new Blob([body]);
    if (body !== null && typeof body !== 'string' && !(body instanceof Blob) && !body.form)
      throw new TypeError('请求体支持文本、Blob、File、FormData、URLSearchParams 和二进制数组。');
    const value = await rpc('request', { path, method: init.method || 'GET', headers: [...new Headers(init.headers)], body }, init.signal);
    const channel = value.port;
    let disposed = false, pendingPull;
    const cleanup = () => { if (disposed) return; disposed = true; init.signal?.removeEventListener('abort', abort); channel?.close(); };
    const abort = () => { channel?.postMessage({ op: 'cancel' }); pendingPull?.error(new DOMException('请求已取消', 'AbortError')); cleanup(); };
    const stream = channel ? new ReadableStream({
      start(controller) {
        pendingPull = controller;
        channel.onmessage = ({ data }) => {
          if (disposed) return;
          if (data.error) { controller.error(new Error(data.error)); cleanup(); }
          else if (data.done) { controller.close(); cleanup(); }
          else controller.enqueue(new Uint8Array(data.chunk));
        };
        channel.start();
        init.signal?.addEventListener('abort', abort, { once: true });
        if (init.signal?.aborted) abort();
      },
      pull() { if (!disposed) channel.postMessage({ op: 'pull' }); },
      cancel() { channel.postMessage({ op: 'cancel' }); cleanup(); }
    }, { highWaterMark: 0 }) : null;
    return new Response(stream, { status: value.status, statusText: value.statusText, headers: value.headers });
  }
  window.ShiroBotDashboard = Object.freeze({
    ready,
    request: httpRequest,
    call(action, args = null) { return rpc('call', { action, arguments: args }); },
    async asset(path) {
      const value = await rpc('asset', { path });
      return new Blob([value.bytes], { type: value.contentType });
    },
    async assetUrl(path) {
      const blob = await this.asset(path), url = URL.createObjectURL(blob);
      urls.add(url); return url;
    },
    revokeAssetUrl(url) { if (urls.delete(url)) URL.revokeObjectURL(url); }
  });
  window.addEventListener('pagehide', () => { port?.close(); urls.forEach(url => URL.revokeObjectURL(url)); });
})();`

export function webBootstrap(nonce: string) { return WEB_BOOTSTRAP.replace('/*SESSION*/', JSON.stringify(nonce).replaceAll('<', '\\u003c')) }

export function webPageDocument(html: string, nonce: string) {
  const policy = "default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline' blob:; img-src blob: data:; font-src blob: data:; media-src blob: data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
  // Parse only inside the sandbox, with the policy already in force. DOMParser in the
  // privileged parent can initiate subresource requests before a policy is inserted.
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><script>${webBootstrap(nonce)}</script>\n${html}`
}

export interface WebBridgeMessage { id: number; op: 'call' | 'asset' | 'request' | 'cancel'; action?: string; arguments?: unknown; path?: string
  method?: string; headers?: [string, string][]; body?: string | Blob | { form: [string, string | File][] } | null }
export function validWebBridgeMessage(value: unknown): value is WebBridgeMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as WebBridgeMessage
  return Number.isSafeInteger(message.id) && message.id > 0 && (
    message.op === 'call' && typeof message.action === 'string' && message.action.length > 0 && message.action.length <= 100 ||
    message.op === 'asset' && typeof message.path === 'string' && message.path.length > 0 && message.path.length <= 512 ||
    message.op === 'request' && typeof message.path === 'string' && message.path.length > 0 && message.path.length <= 8192 ||
    message.op === 'cancel')
}
