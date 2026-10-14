import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeRestartNotice } from '../src/features/hostPower/restartNotice.ts'

test('a fresh or old host does not produce a false restart warning', () => {
  assert.deepEqual(normalizeRestartNotice(null), { recommended: false, reasons: [] })
  assert.deepEqual(normalizeRestartNotice({}), { recommended: false, reasons: [] })
  assert.deepEqual(normalizeRestartNotice({ recommended: false, reasons: ['old'] }), { recommended: false, reasons: [] })
})
test('restart notice preserves reasons, deduplicates and bounds visible messages', () => {
  assert.deepEqual(normalizeRestartNotice({ recommended: true, reasons: ['  旧插件资源未释放  ', '', null, '旧插件资源未释放'] }),
    { recommended: true, reasons: ['旧插件资源未释放'] })
  assert.equal(normalizeRestartNotice({ recommended: true, reasons: Array.from({ length: 100 }, (_, i) => String(i)) }).reasons.length, 20)
})
test('an explicit recommendation without usable details still prompts restart', () => {
  const notice = normalizeRestartNotice({ recommended: true, reasons: null })
  assert.equal(notice.recommended, true)
  assert.match(notice.reasons[0], /建议重启宿主/)
})
