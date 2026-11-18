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

test('component pages POST bounded state and declared events with Bearer auth', async () => {
  requests = []; response = json({ view: { type: 'column', children: [] }, state: { q: '猫' } })
  const state = { q: '猫', page: '2' }
  await pages.renderPluginPage('Meme', 'lib/../a', state)
  assert.ok(new URL(requests[0].url).pathname.endsWith('/lib%2F..%2Fa/render'))
  assert.deepEqual(JSON.parse(requests[0].init.body), { state })
  assert.equal(requests[0].init.headers.get('Authorization'), 'Bearer test-key')
  const event = { kind: 'action', element: 'n.2', action: 'delete', item: 'exact/id' }
  response = json({ result: { ok: true }, view: null, state })
  await pages.sendPluginPageEvent('Meme', 'library', state, event)
  assert.deepEqual(JSON.parse(requests[1].init.body), { state, event })
  const file = new File(['data'], '猫.png', { type: 'image/png' })
  await pages.uploadPluginPageElement('Meme', 'library', state, 'import', file)
  const url = new URL(requests[2].url)
  assert.equal(url.searchParams.get('element'), 'import')
  assert.deepEqual(JSON.parse(url.searchParams.get('state')), state)
  assert.equal(requests[2].init.body, file)
  assert.equal(requests[2].init.headers.get('Authorization'), 'Bearer test-key')
  assert.equal(url.searchParams.get('token'), null)
})
test('component renderer escapes plugin content and only renders allowed row actions', async () => {
  const { default: Renderer } = await server.ssrLoadModule('/src/views/pluginPages/UiRenderer.vue')
  const node = { type: 'column', children: [
    { type: 'text', text: '<script>alert(1)</script>' },
    { type: 'text', markdown: true, text: '**Bold** <img src=x onerror=alert(1)> [unsafe](javascript:alert(1))' },
    { type: 'link', text: 'unsafe link', url: 'javascript:alert(1)' },
    { type: 'gallery', id: 'n.3', actions: [{ id: 'delete', label: 'Delete' }, { id: 'format', label: 'Forbidden' }], rows: [{ key: 'one', cells: [], card: { title: 'Cat', tags: ['cute'] }, actions: ['delete'] }] },
    { type: 'upload', id: 'import', label: 'Upload', accept: ['image/png'], max_bytes: 1000 },
    { type: 'form', id: 'hidden', dialog: true, submit_label: 'Hidden save', fields: [] },
    { type: 'pager', id: 'page', total: 25, page_size: 24 }
  ] }
  const html = await renderToString(createSSRApp(Renderer, { node, state: {}, pluginId: 'Meme', pageId: 'library', busy: false, pagerReset: {} }))
  assert.ok(html.includes('&lt;script&gt;') && !html.includes('<script>'))
  assert.ok(/<strong[^>]*>Bold<\/strong>/.test(html) && !html.includes('<img src=x'))
  assert.ok(!html.includes('href="javascript:'))
  assert.ok(html.includes('Delete') && !html.includes('Forbidden'))
  assert.ok(html.includes('accept="image/png"') && html.includes('type="file"'))
  assert.ok(!html.includes('Hidden save'))
  assert.ok(html.includes('共 25 条'))
})

test('adapter pages keep render, events, files and uploads under the adapter instance', async () => {
  requests = []
  response = json({ pages: [], view: null, state: {}, result: { ok: true }, value: null })
  const controller = new AbortController()
  await pages.getPluginPages('qq/main', controller.signal, 'adapters')
  await pages.renderPluginPage('qq/main', 'panel/x', {}, controller.signal, 'adapters')
  await pages.sendPluginPageEvent('qq/main', 'panel/x', {}, { kind: 'click', element: 'login' }, controller.signal, 'adapters')
  await pages.uploadPluginPageElement('qq/main', 'panel/x', {}, 'upload', new File(['test'], 'test.txt'), controller.signal, 'adapters')
  await pages.getPluginWebPage('qq/main', 'panel/x', controller.signal, 'adapters')
  await pages.callPluginWebPage('qq/main', 'panel/x', 'status', {}, controller.signal, 'adapters')
  response = () => new Response('image', { headers: { 'Content-Type': 'image/png' } })
  await pages.getPluginPageImage('qq/main', 'panel/x', 'logo', controller.signal, 'adapters')
  await pages.getPluginWebAsset('qq/main', 'panel/x', 'logo.png', controller.signal, 'adapters')
  await pages.requestPluginWebPage('qq/main', 'panel/x', '/state', { signal: controller.signal }, 'adapters')
  assert.equal(requests.length, 9)
  for (const { url, init } of requests) {
    assert.ok(url.startsWith('https://backend.example/shiro/api/v1/adapters/qq%2Fmain/pages'))
    assert.equal(init.headers.get('Authorization'), 'Bearer test-key')
    assert.equal(init.signal, controller.signal)
  }
  assert.ok(requests[1].url.endsWith('/panel%2Fx/render'))
  assert.ok(requests[2].url.endsWith('/panel%2Fx/events'))
  assert.ok(requests[3].url.includes('/panel%2Fx/upload?'))
  assert.ok(requests[6].url.includes('/panel%2Fx/files?'))
})
