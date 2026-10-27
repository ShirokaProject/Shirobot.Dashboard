import test from 'node:test'
import assert from 'node:assert/strict'
import { directoryOptions, normalizeDirectoryValues, userValue } from '../src/features/directory.ts'

test('friends become instanceId:userId choices, one per instance', () => {
  const options = directoryOptions('users', [
    { instance: 'qq-main', instance_name: 'QQ 主号', id: '10001', name: '小白' },
    { instance: 'qq-alt', instance_name: 'QQ 小号', id: '10001', name: null }
  ])
  assert.deepEqual(options.map(option => option.value), ['qq-main:10001', 'qq-alt:10001'])
  assert.equal(options[1].name, '10001')
  assert.equal(options[0].detail, '10001 · QQ 主号')
})

test('a group seen by several instances is one choice by its bare ID', () => {
  const options = directoryOptions('groups', [
    { instance: 'a', instance_name: '主号', id: '913449089', name: '测试群' },
    { instance: 'b', instance_name: '小号', id: '913449089', name: '测试群' }
  ])
  assert.deepEqual(options, [{ value: '913449089', name: '测试群', detail: '913449089 · 主号、小号' }])
})

test('user values escape colons like the host, typed values split and dedupe', () => {
  assert.equal(userValue('qq:main', '1'), 'qq%3Amain:1')
  assert.deepEqual(normalizeDirectoryValues([' a,b ', 'b', 'c d', '']), ['a', 'b', 'c', 'd'])
})
