import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'

let server, bridge, api
const originalFetch = globalThis.fetch, originalStorage = globalThis.sessionStorage
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  bridge = await server.ssrLoadModule('/src/views/pluginPages/webBridge.ts')
  api = await server.ssrLoadModule('/src/api/plugins/pages.ts')
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
  assert.ok(source.includes('data.nonce === expectedNonce'))
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
