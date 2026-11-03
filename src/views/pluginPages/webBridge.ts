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
  async function request(op, payload) {
    if (pending.size >= 32) throw new Error('同时进行的网页请求过多。');
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ready.then(() => port.postMessage({ id, op, ...payload }));
    });
  }
  window.ShiroBotDashboard = Object.freeze({
    ready,
    call(action, args = null) { return request('call', { action, arguments: args }); },
    async asset(path) {
      const value = await request('asset', { path });
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

export interface WebBridgeMessage { id: number; op: 'call' | 'asset'; action?: string; arguments?: unknown; path?: string }
export function validWebBridgeMessage(value: unknown): value is WebBridgeMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as WebBridgeMessage
  return Number.isSafeInteger(message.id) && message.id > 0 && (
    message.op === 'call' && typeof message.action === 'string' && message.action.length > 0 && message.action.length <= 100 ||
    message.op === 'asset' && typeof message.path === 'string' && message.path.length > 0 && message.path.length <= 512)
}
