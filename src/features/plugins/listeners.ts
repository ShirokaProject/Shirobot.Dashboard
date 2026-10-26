import type { PluginEventRoute, PluginListeners, PluginMessageRoute } from '../../api/plugins/plugins'

export interface ListenerRow {
  scope: '群聊' | '私聊' | '群聊和私聊' | '事件'
  text: string
  /** Literal command text, shown in mono */
  code?: string
}

const EVENT_LABELS: Record<string, string> = {
  BotEvent: '全部事件',
  MessageEvent: '消息',
  MessageDeletedEvent: '消息撤回',
  MemberJoinedEvent: '成员加入',
  MemberLeftEvent: '成员退出',
  FriendRequestEvent: '好友请求',
  GuildInviteEvent: '群 / 服务器邀请',
  BotOfflineEvent: '机器人离线',
  PlatformEvent: '平台事件',
  InteractionEvent: '按钮交互',
  MessageReactionEvent: '表情回应'
}

function describeRoute(route: PluginMessageRoute): Omit<ListenerRow, 'scope'> {
  switch (route.match) {
    case 'exact': return { text: '命令', code: route.pattern ?? '' }
    case 'prefix': return { text: '以此开头', code: route.pattern ?? '' }
    case 'mention': return { text: route.argument ? `@${route.argument} 时` : '消息中有 @ 时' }
    case 'mention_all': return { text: '@全体成员时' }
    case 'reply': return { text: route.argument ? `回复消息 ${route.argument} 时` : '回复消息时' }
    case 'custom': return { text: route.description || '自定义条件' }
    case 'all': return { text: '全部消息' }
    default: return { text: route.description || route.match }
  }
}

function describeEvent(route: PluginEventRoute): string {
  const label = route.platform_kind ? `平台事件 ${route.platform_kind}` : EVENT_LABELS[route.type] ?? route.type
  if (route.description) return `${label}（${route.description}）`
  return route.filtered ? `${label}（带条件）` : label
}

/**
 * Display rows for a plugin's listeners. Routes registered through AllCommands appear in both
 * routers and are merged into one 群聊和私聊 row.
 */
export function formatPluginListeners(listeners: PluginListeners): ListenerRow[] {
  const rows: ListenerRow[] = []
  const key = (route: PluginMessageRoute) => JSON.stringify([route.match, route.pattern, route.argument, route.description])
  const direct = new Map(listeners.direct.map(route => [key(route), route]))

  if (listeners.group_all_messages) rows.push({ scope: '群聊', text: '接收全部群聊消息' })
  if (listeners.direct_all_messages) rows.push({ scope: '私聊', text: '接收全部私聊消息' })
  for (const route of listeners.group) {
    const shared = direct.delete(key(route))
    rows.push({ scope: shared ? '群聊和私聊' : '群聊', ...describeRoute(route) })
  }
  for (const route of direct.values()) rows.push({ scope: '私聊', ...describeRoute(route) })
  // MessageEvent subscriptions already show as 接收全部消息 above.
  const seen = new Set<string>()
  for (const route of listeners.events) {
    if (route.type === 'MessageEvent' && !route.filtered && !route.description) continue
    const text = describeEvent(route)
    if (seen.has(text)) continue
    seen.add(text)
    rows.push({ scope: '事件', text })
  }
  return rows
}

const SCOPE_ORDER: ListenerRow['scope'][] = ['群聊和私聊', '群聊', '私聊', '事件']

/** Rows of {@link formatPluginListeners} grouped by scope, for one card per scope. */
export function groupPluginListeners(listeners: PluginListeners) {
  const rows = formatPluginListeners(listeners)
  return SCOPE_ORDER
    .map(scope => ({ scope, rows: rows.filter(row => row.scope === scope) }))
    .filter(section => section.rows.length)
}
