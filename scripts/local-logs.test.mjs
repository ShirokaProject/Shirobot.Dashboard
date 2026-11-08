import assert from 'node:assert/strict'
import test from 'node:test'
import { getDemoApiResponse as request } from '../src/api/demo.ts'

test('log settings have their own category with local storage enabled for three days by default', async () => {
  const response = await request('/api/v1/config')
  const logs = response.schema.find(item => item.key === 'logs')
  assert.equal(logs.group_id, 'logs')
  assert.equal(logs.group_label, '日志')
  const runtime = response.schema.filter(item => item.group_id === 'runtime')
  assert.deepEqual(runtime.map(item => item.key).sort(), ['disable_console_input', 'enable_log', 'showid'])
  assert.equal(runtime.find(item => item.key === 'enable_log').group_icon, 'settings')
  assert.equal(response.config.logs.save_to_file, true)
  assert.equal(response.config.logs.retention_days, 3)
  assert.deepEqual(logs.fields.map(item => item.key), ['save_to_file', 'retention_days'])
  await request('/api/v1/config', { method: 'PATCH', body: JSON.stringify({ config: { logs: { save_to_file: true, retention_days: 3 } } }) })
  const saved = await request('/api/v1/config')
  assert.deepEqual(saved.config.logs, { save_to_file: true, retention_days: 3 })
})
