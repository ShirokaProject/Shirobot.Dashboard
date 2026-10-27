import test from 'node:test'
import assert from 'node:assert/strict'
import { formatAdapterPlatform, modelsFromAbi } from '../src/features/adapters/platform.ts'

test('the chat platform from the model comes before the adapter protocol', () => {
  assert.equal(formatAdapterPlatform('milky', ['QQ']), 'QQ · Milky')
  assert.equal(formatAdapterPlatform('telegram', ['Telegram']), 'Telegram')
  assert.equal(formatAdapterPlatform('onebot', []), 'OneBot')
  assert.equal(formatAdapterPlatform('', ['QQ']), 'QQ')
  assert.equal(formatAdapterPlatform('', []), '未声明')
})

test('market ABI requirements name the models an adapter references', () => {
  assert.deepEqual(modelsFromAbi({ 'ShiroBot.SDK': '1.2.0.0', 'ShiroBot.Model.QQ': '1.0.0.0' }), ['QQ'])
  assert.deepEqual(modelsFromAbi({ 'Model.Discord': '1.0.0.0' }), ['Discord'])
})
