import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createServer } from 'vite'
import { createSSRApp, effectScope, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'

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

const examplePage = { id: 'library', title: '表情库', kind: 'gallery', page_size: 24, columns: [], filters: [], actions: [] }
async function settled(predicate) {
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(resolve => setImmediate(resolve))
    if (predicate()) return
  }
  assert.ok(predicate(), 'Async navigation did not settle')
}
test('config navigation renders configuration, plugin pages and routes as three separated sections', async () => {
  const { default: ConfigNav } = await server.ssrLoadModule('/src/views/pluginConfig/components/ConfigNav.vue')
  const { pluginPageView } = await server.ssrLoadModule('/src/views/pluginPages/usePluginPages.ts')
  const html = await renderToString(createSSRApp(ConfigNav, {
    groups: [{ key: 'meme', label: '表情库设置', fields: [] }], pages: [examplePage],
    view: pluginPageView('library'), showRoutes: true, showListeners: true
  }))
  assert.equal([...html.matchAll(/<hr/g)].length, 2)
  assert.ok(html.indexOf('aria-label="配置分组"') < html.indexOf('aria-label="插件页面"'))
  assert.ok(html.indexOf('aria-label="插件页面"') < html.indexOf('aria-label="路由与监听"'))
  assert.ok(html.includes('aria-current="true"'))
})
test('page navigation ignores stale plugin responses and cancels on scope disposal', async () => {
  const { usePluginPages } = await server.ssrLoadModule('/src/views/pluginPages/usePluginPages.ts')
  requests = []
  let resolveOld
  response = () => new Promise(resolve => { resolveOld = resolve })
  const id = ref('old'), enabled = ref(true), scope = effectScope()
  const navigation = scope.run(() => usePluginPages(id, enabled))
  await nextTick()
  const oldSignal = requests[0].init.signal
  response = json({ pages: [examplePage] }); id.value = 'new'
  await settled(() => !navigation.loading.value && navigation.pages.value.length === 1)
  assert.equal(oldSignal.aborted, true)
  resolveOld(json({ pages: [{ ...examplePage, id: 'stale' }] })())
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(navigation.pages.value[0].id, 'library')
  requests = []; response = () => new Promise(() => {})
  void navigation.load(); await nextTick()
  scope.stop()
  assert.equal(requests[0].init.signal.aborted, true)
})
test('older hosts and adapter targets do not break the configuration workspace', async () => {
  const { usePluginPages } = await server.ssrLoadModule('/src/views/pluginPages/usePluginPages.ts')
  response = json({ error: 'not_found' }, 404)
  const scope = effectScope(), enabled = ref(true)
  const navigation = scope.run(() => usePluginPages('plugin', enabled))
  await settled(() => !navigation.loading.value)
  assert.deepEqual([...navigation.pages.value], [])
  assert.equal(navigation.error.value, '')
  requests = []; enabled.value = false; await nextTick()
  await navigation.load()
  assert.equal(requests.length, 0)
  scope.stop()
})

test('uploads send original file bytes to the authenticated page endpoint', async () => {
  requests = []; response = json({ ok: true, message: '已上传', refresh: true })
  const file = new File([new Uint8Array([1, 2, 3])], '猫 & dog.png', { type: 'image/png' })
  const controller = new AbortController()
  const result = await pages.uploadPluginPageFile('Meme', 'library', file, controller.signal)
  assert.equal(requests[0].init.method, 'POST')
  assert.equal(requests[0].init.headers.get('Authorization'), 'Bearer test-key')
  assert.equal(requests[0].init.headers.get('Content-Type'), 'image/png')
  assert.equal(requests[0].init.body, file)
  assert.equal(requests[0].init.signal, controller.signal)
  assert.equal(new URL(requests[0].url).searchParams.get('name'), '猫 & dog.png')
  assert.equal(result.refresh, true)
})
test('the configuration page panel renders upload controls only for declared uploads', async () => {
  const { default: Panel } = await server.ssrLoadModule('/src/views/pluginPages/PluginPagePanel.vue')
  response = json({ items: [], metrics: [], has_more: false })
  const upload = { label: '上传图片', content_types: ['image/png', 'image/gif'], max_bytes: 5000000 }
  const html = await renderToString(createSSRApp(Panel, { pluginId: 'Meme', definition: { ...examplePage, upload } }))
  assert.ok(html.includes('type="file"') && html.includes('multiple'))
  assert.ok(html.includes('accept="image/png,image/gif"') && html.includes('上传图片'))
  const readOnly = await renderToString(createSSRApp(Panel, { pluginId: 'Meme', definition: examplePage }))
  assert.ok(!readOnly.includes('type="file"'))
})
