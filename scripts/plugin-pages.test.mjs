import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createServer } from 'vite'

let server, pages, http
const originalFetch = globalThis.fetch
const originalStorage = globalThis.sessionStorage
let requests = []
let response
before(async () => {
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ mode: 'api', token: 'test-key', baseUrl: 'https://backend.example/shiro' }) }
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init })
    return response()
  }
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  pages = await server.ssrLoadModule('/src/api/plugins/pages.ts')
  http = await server.ssrLoadModule('/src/api/core/http.ts')
})
after(async () => {
  await server?.close()
  globalThis.fetch = originalFetch
  if (originalStorage) globalThis.sessionStorage = originalStorage
  else delete globalThis.sessionStorage
})

function json(value, status = 200) {
  return () => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
}
test('plugin page routes encode plugin, page and item IDs without arbitrary plugin URLs', async () => {
  requests = []; response = json({ pages: [] })
  await pages.getPluginPages('Meme/插件')
  assert.equal(requests[0].url, 'https://backend.example/shiro/api/v1/plugins/Meme%2F%E6%8F%92%E4%BB%B6/pages')
  assert.equal(requests[0].init.headers.get('Authorization'), 'Bearer test-key')
  response = json({ items: [], has_more: false, metrics: [] })
  await pages.getPluginPageData('Meme', 'lib/../q', 2, 24, { q: '猫 & 狗', page: '999' })
  const url = new URL(requests[1].url)
  assert.equal(url.searchParams.get('q'), '猫 & 狗')
  assert.equal(url.searchParams.get('page'), '2')
  assert.ok(url.pathname.includes('lib%2F..%2Fq'))
})
test('image files use the session backend and Bearer header, without token query parameters', async () => {
  requests = []
  response = () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } })
  const controller = new AbortController()
  const image = await pages.getPluginPageImage('Meme', 'library', 'id?token=bad&x=1', controller.signal)
  assert.equal(image.type, 'image/png')
  assert.deepEqual([...new Uint8Array(await image.arrayBuffer())], [1, 2, 3])
  assert.equal(requests[0].init.headers.get('Authorization'), 'Bearer test-key')
  assert.equal(requests[0].init.signal, controller.signal)
  const url = new URL(requests[0].url)
  assert.equal(url.searchParams.get('id'), 'id?token=bad&x=1')
  assert.equal(url.searchParams.get('token'), null)
})
test('item actions POST to host routes and preserve the refresh result', async () => {
  requests = []; response = json({ ok: true, message: '已删除', refresh: true })
  const result = await pages.runPluginPageAction('Meme', 'library', 'delete', 'id/with?symbols')
  assert.equal(requests[0].init.method, 'POST')
  assert.equal(new URL(requests[0].url).searchParams.get('item'), 'id/with?symbols')
  assert.equal(result.refresh, true)
})
test('binary requests report authentication failure through the shared session handler', async () => {
  let unauthorized = 0
  http.setUnauthorizedHandler(() => unauthorized++)
  response = json({ message: 'invalid key' }, 401)
  await assert.rejects(pages.getPluginPageImage('Meme', 'library', 'id'), error => error.status === 401)
  assert.equal(unauthorized, 1)
})
