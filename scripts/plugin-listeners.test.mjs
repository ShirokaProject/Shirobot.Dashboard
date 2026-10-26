import assert from 'node:assert/strict'
import test from 'node:test'
import { formatPluginListeners } from '../src/features/plugins/listeners.ts'

const empty = { group: [], direct: [], group_all_messages: false, direct_all_messages: false, events: [] }
const route = (match, extra = {}) => ({ match, pattern: null, argument: null, description: null, ...extra })

test('commands, mentions and custom conditions read as listeners', () => {
  const rows = formatPluginListeners({
    ...empty,
    group: [route('prefix', { pattern: '/签到' }), route('mention'), route('mention', { argument: '10001' }), route('custom'), route('custom', { description: '包含关键词 天气' })]
  })
  assert.deepEqual(rows.map(row => [row.scope, row.text, row.code]), [
    ['群聊', '以此开头', '/签到'],
    ['群聊', '消息中有 @ 时', undefined],
    ['群聊', '@10001 时', undefined],
    ['群聊', '自定义条件', undefined],
    ['群聊', '包含关键词 天气', undefined]
  ])
})

test('routes registered for both group and direct chat merge into one row', () => {
  const menu = route('exact', { pattern: '菜单' })
  const rows = formatPluginListeners({ ...empty, group: [menu], direct: [menu, route('reply')] })
  assert.deepEqual(rows.map(row => [row.scope, row.text]), [['群聊和私聊', '命令'], ['私聊', '回复消息时']])
})

test('events use readable names, platform kinds and skip the implied message subscription', () => {
  const rows = formatPluginListeners({
    ...empty,
    group_all_messages: true,
    events: [
      { type: 'MessageEvent', full_type: null, platform_kind: null, filtered: false, description: null },
      { type: 'MemberJoinedEvent', full_type: null, platform_kind: null, filtered: false, description: null },
      { type: 'MemberLeftEvent', full_type: null, platform_kind: null, filtered: true, description: null },
      { type: 'PlatformEvent', full_type: null, platform_kind: 'poke', filtered: false, description: null },
      { type: 'CustomVendorEvent', full_type: null, platform_kind: null, filtered: true, description: '仅图片' }
    ]
  })
  assert.deepEqual(rows.map(row => [row.scope, row.text]), [
    ['群聊', '接收全部群聊消息'],
    ['事件', '成员加入'],
    ['事件', '成员退出（带条件）'],
    ['事件', '平台事件 poke'],
    ['事件', 'CustomVendorEvent（仅图片）']
  ])
})
