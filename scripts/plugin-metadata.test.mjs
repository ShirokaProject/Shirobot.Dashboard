import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

let server, Detail, Facts
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
  Detail = (await server.ssrLoadModule('/src/views/plugins/components/InstalledDetail.vue')).default
  Facts = (await server.ssrLoadModule('/src/views/plugins/components/MarketFacts.vue')).default
})
after(async () => { await server?.close() })

const plugin = {
  id: 'Shirobot.Plugin.KotoSub', name: 'KotoSub', author: 'PVPGOOD',
  repo: 'ShirokaProject/Shirobot.Plugin.RssSubscriber', version: '0.3.0',
  status: 'enabled', hasUpdate: false, category: 'Integration', description: '订阅推送插件',
  priority: 2, permissions: [], history: []
}
const props = { marketPlugin: null, publishedAt: '', compatibility: '—', statusText: () => '启用', actions: [], actionsLoading: false, actionsError: '', runningActionId: '', hostOperation: '', canUpdate: false }

test('installed DLL metadata is visible even when its marketplace identity does not match', async () => {
  const html = await renderToString(createSSRApp(Detail, { ...props, plugin }))
  for (const expected of ['Shirobot.Plugin.KotoSub', 'PVPGOOD', 'Integration', 'v0.3.0', '优先级', 'https://github.com/ShirokaProject/Shirobot.Plugin.RssSubscriber']) assert.ok(html.includes(expected), expected)
  assert.ok(!html.includes('下载</dt>'))
})
test('installed plugins with no repository explicitly show missing metadata', async () => {
  const html = await renderToString(createSSRApp(Detail, { ...props, plugin: { ...plugin, repo: undefined } }))
  assert.ok(html.includes('插件 ID') && html.includes('仓库') && html.includes('未声明'))
})
test('market data does not replace the repository declared by the installed DLL', async () => {
  const market = { repository: 'https://github.com/ShirokaProject/Shirobot.Plugin.KotoSub', release: { downloadCount: 1, publishedAt: null }, license: '' }
  const html = await renderToString(createSSRApp(Facts, { pluginId: plugin.id, repository: plugin.repo, plugin: market, publishedAt: '', compatibility: '—' }))
  assert.ok(html.includes('https://github.com/ShirokaProject/Shirobot.Plugin.RssSubscriber'))
  assert.ok(!html.includes('href="https://github.com/ShirokaProject/Shirobot.Plugin.KotoSub"'))
  const discover = await renderToString(createSSRApp(Facts, { plugin: market, publishedAt: '', compatibility: '—' }))
  assert.ok(discover.includes('href="https://github.com/ShirokaProject/Shirobot.Plugin.KotoSub"'))
})
