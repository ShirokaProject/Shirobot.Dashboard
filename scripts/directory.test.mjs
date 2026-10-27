import test from 'node:test'
import assert from 'node:assert/strict'
import { directoryOptions, normalizeDirectoryValues, searchDirectory, userValue } from '../src/features/directory.ts'

test('friends become instanceId:userId choices, one per instance', () => {
  const options = directoryOptions('users', [
    { instance: 'qq-main', instance_name: 'QQ 主号', id: '10001', name: '小白' },
    { instance: 'qq-alt', instance_name: 'QQ 小号', id: '10001', name: null }
  ])
  assert.deepEqual(options.map(option => option.value), ['qq-main:10001', 'qq-alt:10001'])
  assert.equal(options[1].label, '10001')
  assert.equal(options[0].label, '小白 · 10001')
  assert.equal(options[0].instances, 'QQ 主号')
})

test('a group seen by several instances is one choice by its bare ID', () => {
  const options = directoryOptions('groups', [
    { instance: 'a', instance_name: '主号', id: '913449089', name: '测试群' },
    { instance: 'b', instance_name: '小号', id: '913449089', name: '测试群' }
  ])
  assert.deepEqual(options, [{ value: '913449089', name: '测试群', id: '913449089', instances: '主号、小号', label: '测试群 · 913449089' }])
})

test('user values escape colons like the host, typed values split and dedupe', () => {
  assert.equal(userValue('qq:main', '1'), 'qq%3Amain:1')
  assert.deepEqual(normalizeDirectoryValues([' a,b ', 'b', 'c d', '']), ['a', 'b', 'c', 'd'])
})

test('one instance is not named; searches rank name starts, then number starts, then contains, and stop at the limit', () => {
  const options = directoryOptions('users', [
    { instance: 'mml', instance_name: 'mml', id: '1129544397', name: '凛月寒' },
    { instance: 'mml', instance_name: 'mml', id: '873311020', name: '冬凛' },
    { instance: 'mml', instance_name: 'mml', id: '765666337', name: 'iRis' }
  ])
  assert.ok(options.every(option => option.instances === ''))
  assert.deepEqual(searchDirectory(options, '凛').map(option => option.name), ['凛月寒', '冬凛'])
  assert.deepEqual(searchDirectory(options, '76').map(option => option.name), ['iRis'])
  assert.deepEqual(searchDirectory(options, '  '), [])
  assert.equal(searchDirectory(options, '凛', 1).length, 1)
})
