import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contractAbiRejection, formatContractCompatibility, formatLicense } from '../src/features/plugins/formatCompatibility.ts'

test('ABI requirements ignore legacy API and directory declarations', () => {
  const result = formatContractCompatibility({ shirobot: '>=0.9.8', framework: 'net10.0', status: 'verified', api: { minimum: '1.0', testedThrough: '1.0' }, abi: { 'ShiroBot.SDK': '1.2.0.0' } })
  assert.doesNotMatch(result, /API ≥|已测试/)
  assert.match(result, /SDK ABI 1.2.0.0/)
  assert.doesNotMatch(result, /0.9.8/)
})
test('unknown metadata does not claim old host compatibility', () => {
  assert.equal(formatContractCompatibility({ shirobot: '>=0.9.8', status: 'unknown', framework: 'unknown' }), 'ABI 未知')
  assert.equal(formatContractCompatibility({ shirobot: '>=0.9.8', framework: 'net10.0' }), '目录声明 >=0.9.8 · net10.0')
})

test('ABI is displayed even when legacy metadata status was unknown', () => {
  assert.equal(formatContractCompatibility({ status: 'unknown', api: { minimum: '99.0', testedThrough: '99.0' }, abi: { 'ShiroBot.SDK': '1.2.0.0' }, framework: 'net10.0' }), 'SDK ABI 1.2.0.0 · net10.0')
})

test('SPDX placeholders from license detection read as Chinese', () => {
  assert.equal(formatLicense('NOASSERTION'), '未识别')
  assert.equal(formatLicense('NONE'), '无')
  assert.equal(formatLicense(' GPL-3.0-only '), 'GPL-3.0-only')
  assert.equal(formatLicense(undefined), '')
})

test('installation ABI gate matches the host major and minimum-version policy', () => {
  const host = { 'ShiroBot.SDK': '1.4.0.0', 'ShiroBot.Model.QQ': '1.0.0.0' }
  assert.equal(contractAbiRejection({ 'ShiroBot.SDK': '1.3.0.0' }, host), '')
  assert.equal(contractAbiRejection({ SDK: '1.4.0.0' }, host), '')
  for (const version of ['1.5.0.0', '2.0.0.0', '0.9.0.0', 'invalid']) {
    assert.ok(contractAbiRejection({ 'ShiroBot.SDK': version }, host))
  }
  assert.ok(contractAbiRejection({ 'ShiroBot.Model.Telegram': '1.0.0.0' }, host))
  assert.ok(contractAbiRejection({ SDK: '1.0.0.0' }, null))
  assert.equal(contractAbiRejection(undefined, null), '')
})
