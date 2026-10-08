import assert from 'node:assert/strict'
import test from 'node:test'
import { installedPluginSnapshot, pluginMarketSnapshot, adapterMarketSnapshot, pluginUpdateCount, adapterUpdateCount } from '../src/features/plugins/updateCounts.ts'

test('navigation counts follow installed versions, including disabled and broken plugins', () => {
  installedPluginSnapshot.value = [
    { id: 'JmParser', repo: 'https://github.com/greepar/ShiroBot.Plugin.JmParser', version: '1.3.0', status: 'disabled', hasUpdate: false },
    { id: 'broken', version: '1.0.0', status: 'error', hasUpdate: false }
  ]
  pluginMarketSnapshot.value = [
    { id: 'jm-parser', repository: 'greepar/ShiroBot.Plugin.JmParser', release: { version: '1.3.2' } },
    { id: 'broken', repository: '', release: { version: '1.0.1' } },
    { id: 'not-installed', repository: '', release: { version: '2.0.0' } }
  ]
  assert.equal(pluginUpdateCount.value, 2)
  installedPluginSnapshot.value = installedPluginSnapshot.value.map(plugin => ({ ...plugin, version: plugin.id === 'JmParser' ? '1.3.2' : '1.0.1' }))
  assert.equal(pluginUpdateCount.value, 0)
  installedPluginSnapshot.value = []
  pluginMarketSnapshot.value = []
})

test('adapter badge counts installed packages with newer versions and clears after update', () => {
  adapterMarketSnapshot.value = [
    { id: 'milky', version: '2.2.1', installedVersion: '2.2.0' },
    { id: 'official', version: '0.4.0', installedVersion: '0.4.0' },
    { id: 'other', version: '1.0.0', installedVersion: null }
  ]
  assert.equal(adapterUpdateCount.value, 1)
  adapterMarketSnapshot.value = adapterMarketSnapshot.value.map(entry => ({ ...entry, installedVersion: entry.version }))
  assert.equal(adapterUpdateCount.value, 0)
  adapterMarketSnapshot.value = []
})

test('host update badge follows availability independently of automatic apply support', async () => {
  const { hostUpdateSnapshot, hostUpdateCount } = await import('../src/features/plugins/updateCounts.ts')
  hostUpdateSnapshot.value = { update_available: true, can_apply: false }
  assert.equal(hostUpdateCount.value, 1)
  hostUpdateSnapshot.value = { update_available: false }
  assert.equal(hostUpdateCount.value, 0)
  hostUpdateSnapshot.value = null
})

test('demo shows all three badges and simulated updates clear them', async () => {
  const { getDemoApiResponse: request } = await import('../src/api/demo.ts')
  const { hostUpdateSnapshot, hostUpdateCount } = await import('../src/features/plugins/updateCounts.ts')
  const refresh = async () => {
    installedPluginSnapshot.value = await request('/api/v1/plugins/list')
    pluginMarketSnapshot.value = (await request('/api/v1/plugin-market/plugins')).plugins
    adapterMarketSnapshot.value = await request('/api/v1/adapter-market/adapters')
    hostUpdateSnapshot.value = await request('/api/v1/system/update')
  }
  const post = (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) })
  await refresh()
  assert.ok(pluginUpdateCount.value > 0)
  assert.equal(adapterUpdateCount.value, 1)
  assert.equal(hostUpdateCount.value, 1)
  const count = pluginUpdateCount.value
  const entry = pluginMarketSnapshot.value.find(entry => entry.id === 'echo')
  const prepared = await post('/api/v1/plugins/install/github', { repository: entry.repository })
  await post(`/api/v1/plugins/upload/${prepared.upload_id}/confirm`, { replace: true, enable: true })
  const adapter = adapterMarketSnapshot.value.find(entry => entry.id === 'shirobot.adapter.onebot')
  const preview = await post('/api/v1/adapters/install/github', { repository: adapter.repository })
  await post(`/api/v1/adapters/upload/${preview.upload_id}/confirm`, { replace: true })
  await post('/api/v1/system/update', {})
  await refresh()
  assert.equal(pluginUpdateCount.value, count - 1)
  assert.equal(adapterUpdateCount.value, 0)
  assert.equal(hostUpdateCount.value, 0)
  assert.equal((await request('/api/v1/overview')).bot_version, hostUpdateSnapshot.value.current_version)
})
