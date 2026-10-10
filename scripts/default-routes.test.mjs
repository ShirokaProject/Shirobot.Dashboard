import assert from 'node:assert/strict'
import test from 'node:test'
import { getDemoApiResponse as request } from '../src/api/demo.ts'

test('default plugin routes are editable in host config and inherited unless overridden', async () => {
  const config = await request('/api/v1/config')
  const routes = config.schema.find(item => item.key === 'plugin_routes')
  assert.deepEqual(routes.fields[0].fields.map(item => item.key), ['mode', 'groups'])
  const patch = (url, body) => request(url, { method: 'PATCH', body: JSON.stringify(body) })
  await patch('/api/v1/config', { config: { plugin_routes: { default: { mode: 'whitelist', groups: ['123'] } } } })
  let plugin = await request('/api/v1/plugins/JmParser/config')
  assert.equal(plugin.routes.default_mode, 'whitelist')
  assert.deepEqual(plugin.routes.effective_groups, ['123'])
  await patch('/api/v1/plugins/JmParser/config', { routes: { mode: 'blacklist', groups: ['456'] } })
  await patch('/api/v1/config', { config: { plugin_routes: { default: { mode: 'blacklist', groups: [] } } } })
  plugin = await request('/api/v1/plugins/JmParser/config')
  assert.deepEqual(plugin.routes.default_groups, [])
  assert.deepEqual(plugin.routes.effective_groups, ['456'])
})
