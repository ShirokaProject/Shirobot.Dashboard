import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'

let server, bridge, api, transport
const originalFetch = globalThis.fetch, originalStorage = globalThis.sessionStorage
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  bridge = await server.ssrLoadModule('/src/views/pluginPages/webBridge.ts')
  api = await server.ssrLoadModule('/src/api/plugins/pages.ts')
  transport = await server.ssrLoadModule('/src/views/pluginPages/webRequest.ts')
})
after(async () => {
  await server.close(); globalThis.fetch = originalFetch
  if (originalStorage) globalThis.sessionStorage = originalStorage; else delete globalThis.sessionStorage
})

test('sandbox bootstrap only accepts the parent channel and proves the document nonce', async () => {
  const listeners = new Map(), sent = [], parent = {}
  const window = { addEventListener: (name, handler) => listeners.set(name, handler), removeEventListener: name => listeners.delete(name) }
  vm.runInNewContext(bridge.webBootstrap('document-nonce'), { window, parent, Blob, URL })
  const port = { postMessage: message => sent.push(message), start() {}, close() {} }
  const init = listeners.get('message')
  init({ source: {}, data: { type: 'shirobot-web-init' }, ports: [port] })
  assert.equal(sent.length, 0)
  init({ source: parent, data: { type: 'shirobot-web-init' }, ports: [port] })
  assert.equal(sent[0].type, 'ready'); assert.equal(sent[0].nonce, 'document-nonce')
  assert.equal(listeners.has('message'), false)
  const pending = window.ShiroBotDashboard.call('preview', { text: '猫' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(sent[1].action, 'preview'); assert.equal(sent[1].op, 'call')
  port.onmessage({ data: { id: sent[1].id, ok: true, value: { length: 1 } } })
  assert.equal((await pending).length, 1)
  const failed = window.ShiroBotDashboard.call('unknown')
  await new Promise(resolve => setImmediate(resolve))
  port.onmessage({ data: { id: sent[2].id, ok: false, error: '操作不存在' } })
  await assert.rejects(failed, /操作不存在/)
})

test('bridge accepts only bounded call/asset messages, never arbitrary URLs or plugin IDs', () => {
  assert.equal(bridge.validWebBridgeMessage({ id: 1, op: 'call', action: 'preview' }), true)
  assert.equal(bridge.validWebBridgeMessage({ id: 2, op: 'asset', path: 'cat.png' }), true)
  for (const message of [null, { id: -1, op: 'call', action: 'x' }, { id: 1, op: 'fetch', url: '/api/v1/config' },
    { id: 1, op: 'call', action: 'x'.repeat(101) }, { id: 1, op: 'asset', path: 'x'.repeat(513) }])
    assert.equal(bridge.validWebBridgeMessage(message), false)
})

test('web APIs use the configured backend and Bearer header without credentials in iframe payloads', async () => {
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ mode: 'api', token: 'test-secret', baseUrl: 'https://backend.example' }) }
  const requests = []
  globalThis.fetch = async (url, init) => { requests.push({ url, init }); return new Response('{"value":null}', { headers: { 'Content-Type': 'application/json' } }) }
  await api.getPluginWebPage('plugin/id', 'editor')
  await api.callPluginWebPage('plugin/id', 'editor', 'save', { text: 'hello' })
  await api.getPluginWebAsset('plugin/id', 'editor', '../config.toml')
  assert.ok(requests.every(r => r.init.headers.get('Authorization') === 'Bearer test-secret'))
  assert.ok(requests.every(r => !r.url.includes('test-secret')))
  assert.equal(JSON.parse(requests[1].init.body).action, 'save')
  assert.ok(requests[0].url.endsWith('/plugins/plugin%2Fid/pages/editor/web'))
})

test('iframe policy preserves opaque origin and denies network and form submission', async () => {
  const source = await readFile(new URL('../src/views/pluginPages/WebPagePanel.vue', import.meta.url), 'utf8')
  assert.ok(source.includes('sandbox="allow-scripts"'))
  assert.ok(!source.includes('allow-same-origin'))
  assert.ok(source.includes("++loads !== 1"))
  assert.ok(source.includes('createWebBridgeHost('))
  assert.ok(source.includes('target !== frame.value'))
  const policy = await readFile(new URL('../src/views/pluginPages/webBridge.ts', import.meta.url), 'utf8')
  assert.ok(policy.includes("connect-src 'none'"))
  assert.ok(policy.includes("form-action 'none'"))
  assert.ok(!bridge.webBootstrap('nonce').includes('test-secret'))
  const document = bridge.webPageDocument('<!doctype html><html><head><script>plugin()</script></head><body>demo</body></html>', 'nonce')
  assert.ok(document.indexOf('Content-Security-Policy') < document.indexOf('plugin()'))
  assert.ok(document.indexOf('shirobot-web-init') < document.indexOf('plugin()'))
  assert.ok(!bridge.webBootstrap('</script>').includes('</script>'))
})

test('raw request paths stay within the current page and credential headers are discarded', () => {
  assert.equal(transport.pageRequestPath('/images/cat.png?size=2'), '/images/cat.png?size=2')
  for (const path of ['https://other/', '//other/', '/../config', '/%2e%2e/config', '/%252e%252e/config', '/a\\b', '/x#fragment'])
    assert.throws(() => transport.pageRequestPath(path))
  const init = transport.pageRequestInit({ method: 'post', body: new Blob(['raw']), headers: [
    ['Authorization', 'evil'], ['Cookie', 'secret'], ['X-Api-Key', 'secret'], ['X-Forwarded-Host', 'host'],
    ['X-Correlation-Id', 'demo'], ['Content-Type', 'image/png']
  ] }, new AbortController().signal)
  assert.equal(init.headers.get('Authorization'), null)
  assert.equal(init.headers.get('Cookie'), null)
  assert.equal(init.headers.get('X-Api-Key'), null)
  assert.equal(init.headers.get('X-Forwarded-Host'), null)
  assert.equal(init.headers.get('X-Correlation-Id'), 'demo')
  assert.equal(init.headers.get('Content-Type'), 'image/png')
  assert.ok(init.body instanceof Blob)
  const form = transport.pageRequestInit({ method: 'POST', body: { form: [['text', '猫'], ['image', new File(['data'], 'cat.png')]] } }, new AbortController().signal)
  assert.ok(form.body instanceof FormData)
  assert.equal(form.body.get('text'), '猫'); assert.equal(form.body.get('image').name, 'cat.png')
  assert.throws(() => transport.pageRequestInit({ method: 'GET', body: 'data' }, new AbortController().signal))
})

function sandbox() {
  const listeners = new Map(), rootPort = { start() {}, close() {}, postMessage() {} }
  const parent = {}, window = { addEventListener: (name, handler) => listeners.set(name, handler), removeEventListener: name => listeners.delete(name) }
  vm.runInNewContext(bridge.webBootstrap('nonce'), { window, parent, Blob, File, URL, FormData, URLSearchParams, Headers,
    ArrayBuffer, Uint8Array, Response, ReadableStream, DOMException })
  listeners.get('message')({ source: parent, data: { type: 'shirobot-web-init' }, ports: [rootPort] })
  return { dashboard: window.ShiroBotDashboard, rootPort }
}

test('request returns a Response and pulls binary chunks with status, headers and backpressure', async () => {
  const original = globalThis.fetch
  const controller = new AbortController()
  let pulls = 0, released = false, received
  const bytes = new Uint8Array([0, 1, 2, 255])
  globalThis.fetch = async (url, init) => {
    received = { url, init }
    return new Response(new ReadableStream({ pull(c) { pulls++; if (pulls === 1) c.enqueue(bytes); else c.close() } }, { highWaterMark: 0 }),
      { status: 206, headers: { 'Content-Type': 'video/mp4', 'Content-Range': 'bytes 2-5/10' } })
  }
  const { dashboard, rootPort } = sandbox()
  rootPort.postMessage = data => {
    void transport.serveWebRequest('plugin/id', 'editor', data, controller,
      message => rootPort.onmessage({ data: { id: data.id, ...message } }), () => { released = true })
  }
  try {
    const response = await dashboard.request('/video', { headers: { Range: 'bytes=2-5' } })
    assert.equal(response.status, 206)
    assert.equal(response.headers.get('content-range'), 'bytes 2-5/10')
    assert.equal(pulls, 0, 'body must not be read before the iframe consumes it')
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [...bytes])
    assert.ok(received.url.includes('/plugins/plugin%2Fid/pages/editor/web/request?path=%2Fvideo'))
    assert.equal(received.init.headers.get('Range'), 'bytes=2-5')
    assert.equal(received.init.credentials, 'omit'); assert.equal(received.init.redirect, 'error')
    assert.equal(released, true)
  } finally { controller.abort(); globalThis.fetch = original }
})

test('business errors remain HTTP responses and cancelling the body aborts upstream', async () => {
  const original = globalThis.fetch, controller = new AbortController()
  let canceled = false
  globalThis.fetch = async () => new Response(new ReadableStream({ cancel() { canceled = true } }), { status: 422 })
  const { dashboard, rootPort } = sandbox()
  rootPort.postMessage = data => { void transport.serveWebRequest('p', 'e', data, controller,
    message => rootPort.onmessage({ data: { id: data.id, ...message } }), () => {}) }
  try {
    const response = await dashboard.request('/validate')
    assert.equal(response.status, 422); assert.equal(response.ok, false)
    await response.body.cancel()
    for (let i = 0; i < 10 && !canceled; i++) await new Promise(resolve => setImmediate(resolve))
    assert.equal(controller.signal.aborted, true); assert.equal(canceled, true)
  } finally { controller.abort(); globalThis.fetch = original }
})

test('AbortSignal cancels a pending HTTP request before headers', async () => {
  const { dashboard, rootPort } = sandbox(), controller = new AbortController(), messages = []
  rootPort.postMessage = data => messages.push(data)
  const response = dashboard.request('/slow', { signal: controller.signal })
  await new Promise(resolve => setImmediate(resolve))
  controller.abort()
  await assert.rejects(response, error => error.name === 'AbortError')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(messages.at(-1).op, 'cancel')
})

test('declared operations are confirmed outside the sandbox, matching paths the way the plugin sees them', async () => {
  const confirmations = { delete: '删除这个表情？', 'DELETE /memes': '删除表情？', 'POST /library/clear': '清空表情库？' }
  const confirm = data => bridge.webPageConfirmation(confirmations, { id: 1, ...data })
  assert.equal(confirm({ op: 'call', action: 'delete' }), '删除这个表情？')
  assert.equal(confirm({ op: 'call', action: 'preview' }), null)
  assert.equal(confirm({ op: 'call', action: 'toString' }), null)
  assert.equal(confirm({ op: 'request', method: 'delete', path: '/memes' }), '删除表情？')
  assert.equal(confirm({ op: 'request', method: 'DELETE', path: '/MEMES/42?force=1' }), '删除表情？')
  assert.equal(confirm({ op: 'request', method: 'DELETE', path: '/%6Demes/42' }), '删除表情？')
  assert.equal(confirm({ op: 'request', method: 'DELETE', path: '/memes-archive' }), null)
  assert.equal(confirm({ op: 'request', method: 'GET', path: '/memes' }), null)
  assert.equal(confirm({ op: 'request', method: 'POST', path: '/library/clear/' }), '清空表情库？')
  assert.equal(bridge.webPageConfirmation(null, { id: 1, op: 'call', action: 'delete' }), null)
})

test('the parent bridge authenticates the document and asks the user before declared operations', async () => {
  const host = await server.ssrLoadModule('/src/views/pluginPages/webBridgeHost.ts')
  const posted = [], calls = [], requests = [], prompts = []
  let closed = false, answer = false
  const controller = new AbortController()
  const handle = host.createWebBridgeHost({
    pluginId: 'meme', pageId: 'library', title: '表情库', nonce: 'n-1', signal: controller.signal,
    confirmations: { clear: '清空全部表情？', 'DELETE /memes': '删除表情？' },
    post: message => posted.push(message), close: () => { closed = true },
    services: {
      confirm: text => { prompts.push(text); return answer },
      call: async (plugin, page, action, args) => { calls.push({ plugin, page, action, args }); return { value: 'ok' } },
      request: async (plugin, page, data, transfer, respond, done) => { requests.push(data); respond({ ok: true, value: {} }); done() },
      asset: async () => { throw new Error('unused') }
    }
  })
  // Before the document proves the nonce nothing is served; a wrong nonce closes the channel.
  const wrong = host.createWebBridgeHost({ pluginId: 'meme', pageId: 'library', title: 't', nonce: 'n-1', signal: controller.signal,
    post: message => posted.push(message), close: () => { closed = true }, services: { call: async () => { calls.push('leak'); return { value: 1 } } } })
  await wrong({ type: 'ready', nonce: 'guessed' })
  await wrong({ id: 1, op: 'call', action: 'preview' })
  assert.ok(closed); assert.equal(calls.length, 0); assert.equal(posted.length, 0)

  await handle({ type: 'ready', nonce: 'n-1' })
  await handle({ id: 1, op: 'call', action: 'preview', arguments: { text: 'x' } })
  assert.equal(prompts.length, 0); assert.equal(calls.at(-1).action, 'preview'); assert.deepEqual(posted.at(-1), { id: 1, ok: true, value: 'ok' })

  answer = false
  await handle({ id: 2, op: 'call', action: 'clear' })
  assert.ok(prompts.at(-1).includes('表情库') && prompts.at(-1).includes('清空全部表情？'))
  assert.equal(calls.length, 1, 'A declined operation must not reach the host.')
  assert.deepEqual(posted.at(-1), { id: 2, ok: false, error: '已取消。' })

  answer = true
  await handle({ id: 3, op: 'call', action: 'clear' })
  assert.equal(calls.at(-1).action, 'clear'); assert.deepEqual(posted.at(-1), { id: 3, ok: true, value: 'ok' })

  answer = false
  await handle({ id: 4, op: 'request', method: 'DELETE', path: '/Memes/7' })
  assert.equal(requests.length, 0); assert.deepEqual(posted.at(-1), { id: 4, ok: false, error: '已取消。' })
  answer = true
  await handle({ id: 5, op: 'request', method: 'DELETE', path: '/Memes/7' })
  assert.equal(requests.at(-1).path, '/Memes/7')
  const asked = prompts.length
  await handle({ id: 6, op: 'request', method: 'GET', path: '/memes' })
  assert.equal(prompts.length, asked, 'Undeclared operations must not prompt.')

  controller.abort()
  await handle({ id: 7, op: 'call', action: 'clear' })
  assert.equal(prompts.length, asked); assert.equal(calls.length, 2, 'Nothing is served after the page closes.')
})

test('the bootstrap removes itself so page scripts cannot read the nonce, and strict pages enforce Trusted Types', () => {
  let removed = false
  const window = { addEventListener() {}, removeEventListener() {} }
  vm.runInNewContext(bridge.webBootstrap('nonce'), { window, parent: {}, Blob, URL, document: { currentScript: { remove() { removed = true } } } })
  assert.ok(removed)
  assert.ok(!bridge.webPageDocument('<p>x</p>', 'nonce').includes('require-trusted-types-for'))
  const strict = bridge.webPageDocument('<p>x</p>', 'nonce', true)
  assert.ok(strict.includes("require-trusted-types-for 'script'") && strict.includes("trusted-types 'none'"))
  assert.ok(strict.indexOf('trusted-types') < strict.indexOf('<p>x</p>'))
})
