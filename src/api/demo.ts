import type { AdapterInfo } from './adapters/adapters'
import type { AppConfig } from './config/config'
import type { RuntimeLogsResponse } from './logs/logs'
import type { OverviewResponse } from './overview/overview'
import type { MarketplacePlugin } from './pluginMarket/pluginMarket'
import type { PluginConfigResponse } from './plugins/config'
import type { PluginUploadResponse } from './plugins/plugins'
import type { RuntimeLog } from '../features/logs/types'
import type { Plugin } from '../features/plugins/types'

const demoOverview: OverviewResponse = {
  shirobotInfo: {
    version: 'v0.1.0-demo',
    commit: 'demo-a13f9c2',
    commitTime: '2026-06-13 18:42',
    uptime: '36h 12m'
  },
  latestError: {
    source: 'AI Chat Plugin',
    message: '演示模式：这里展示后端接入后的最近错误格式。',
    time: '2026-06-13 19:08'
  },
  stats: [
    { key: 'plugins', label: '活跃插件', value: '12', support: '演示数据：2 个插件有可用更新' },
    { key: 'adapters', label: '适配器', value: '4', support: '演示数据：1 个适配器离线' },
    { key: 'messages', label: '今日消息', value: '1.2k', support: '演示数据：+18% 较昨日' },
    { key: 'health', label: '健康状态', value: '正常', support: '演示数据：核心服务在线' }
  ],
  bars: [24, 38, 30, 52, 46, 78, 62, 84, 54, 66, 72, 58],
  events: [
    { title: '演示：OneBot v11 连接成功', time: '12:04' },
    { title: '演示：Echo 插件完成热更新', time: '11:40' },
    { title: '演示：Admin 权限缓存刷新', time: '10:18' },
    { title: '演示：Schedule 插件已停用', time: '09:52' }
  ]
}

const demoPlugins: Plugin[] = [
  {
    id: 'echo',
    name: 'Echo',
    author: 'Shirobot Core',
    version: '1.0.0',
    latestVersion: '1.1.0',
    status: 'enabled',
    hasUpdate: true,
    category: '基础能力',
    description: '演示插件：提供基础回显、连通性测试与消息调试能力。',
    permissions: ['读取消息', '发送消息'],
    history: [
      { version: '1.0.0', date: '2026-06-01' },
      { version: '0.9.0', date: '2026-05-18' }
    ]
  },
  {
    id: 'admin',
    name: 'Admin',
    author: 'Shirobot Core',
    version: '1.2.1',
    latestVersion: '1.2.1',
    status: 'enabled',
    hasUpdate: false,
    category: '管理',
    description: '演示插件：管理员指令、权限分组、封禁与审计能力。',
    permissions: ['读取成员', '管理群组', '写入配置'],
    history: [
      { version: '1.2.1', date: '2026-06-10' },
      { version: '1.2.0', date: '2026-05-29' }
    ]
  },
  {
    id: 'schedule',
    name: 'Schedule',
    author: 'Community',
    version: '0.9.0',
    latestVersion: '1.0.0',
    status: 'disabled',
    hasUpdate: true,
    category: '自动化',
    description: '演示插件：定时任务、定时提醒与周期性消息推送。',
    permissions: ['发送消息', '读取配置', '写入配置'],
    history: [
      { version: '0.9.0', date: '2026-05-20' },
      { version: '0.8.2', date: '2026-05-01' }
    ]
  },
  {
    id: 'ai-chat',
    name: 'AI Chat',
    author: 'Shiro Labs',
    version: '0.6.0',
    latestVersion: '0.6.0',
    status: 'error',
    hasUpdate: false,
    category: 'AI',
    description: '演示插件：接入大模型，实现群聊问答、总结和角色对话。',
    errorMessage: '演示错误：请配置 provider credentials。',
    permissions: ['读取消息', '发送消息', '访问外部 API'],
    history: [
      { version: '0.6.0', date: '2026-06-05' },
      { version: '0.5.2', date: '2026-05-22' }
    ]
  }
]

const demoAdapters: AdapterInfo[] = [
  { type: 'OneBot v11', account: '100000001', connected: true, events: 842 },
  { type: 'Telegram', account: '@demo_bot', connected: false, events: 0 },
  { type: 'Discord', account: 'shirobot-demo', connected: true, events: 126 }
]

const demoConfig: AppConfig = {
  name: 'Shirobot Demo',
  debug: false,
  logLevel: 'info',
  port: '8080',
  workdir: './data',
  hotReload: true,
  remoteAdmin: false,
  admins: '100000001'
}

const demoPluginConfig: PluginConfigResponse = {
  pluginName: 'Echo Demo',
  form: {
    alias: 'Echo Debugger',
    logLevel: 'info',
    debug: false,
    autoLoad: true,
    commandPrefix: '/echo',
    scope: 'all',
    groupMessage: true,
    privateMessage: true,
    timeout: '5000',
    concurrency: '4',
    rawConfig: '{\n  "replyMode": "plain",\n  "trimMessage": true\n}'
  },
  permissions: [
    { key: 'read-message', label: '读取消息', description: '允许插件读取消息事件。', enabled: true },
    { key: 'send-message', label: '发送消息', description: '允许插件发送群聊或私聊消息。', enabled: true },
    { key: 'write-config', label: '写入配置', description: '允许插件修改自身配置。', enabled: false },
    { key: 'external-api', label: '访问外部 API', description: '允许插件请求外部网络服务。', enabled: false }
  ]
}

const demoLogs: RuntimeLog[] = [
  {
    id: 1,
    kind: 'system',
    level: 'INFO',
    time: '22:37:31',
    source: 'Plugin Loader',
    message: '演示：Echo v1.0.0 loaded in 42ms.',
    raw: '[22:37:31] [Plugin Loader] 演示：Echo v1.0.0 loaded in 42ms.',
    traceId: 'demo-pl-93a21c'
  },
  {
    id: 2,
    kind: 'message',
    level: 'INFO',
    time: '22:37:39',
    source: 'OneBot v11',
    groupName: '示例群聊',
    groupId: '100000001',
    userId: '200000001',
    message: '你好，Shirobot',
    raw: '[22:37:39] 收到群消息 示例群聊(100000001) 200000001发送: 你好，Shirobot',
    traceId: 'demo-ob-37f39a'
  },
  {
    id: 3,
    kind: 'plugin',
    level: 'WARN',
    time: '22:38:31',
    source: 'Schedule Plugin',
    message: '演示：heartbeat task delayed by 132ms.',
    raw: '[22:38:31] [Schedule Plugin] 演示：heartbeat task delayed by 132ms.',
    traceId: 'demo-sc-02cafe'
  },
  {
    id: 4,
    kind: 'plugin',
    level: 'ERROR',
    time: '22:43:31',
    source: 'AI Chat Plugin',
    message: '演示：API key missing: please configure provider credentials.',
    raw: '[22:43:31] [AI Chat Plugin] 演示：API key missing: please configure provider credentials.',
    traceId: 'demo-ai-9bb210'
  }
]

const demoMarketplacePlugins: MarketplacePlugin[] = [
  {
    id: 'weather',
    name: 'Weather',
    author: 'Mika',
    version: '2.3.0',
    category: '工具',
    source: 'github.com',
    downloads: '18k',
    downloadsValue: 18000,
    publishedAt: '2026-05-28',
    description: '演示：天气查询、空气质量、灾害预警与城市订阅。'
  },
  {
    id: 'rss',
    name: 'RSS Hub',
    author: 'Community',
    version: '1.4.2',
    category: '订阅',
    source: 'github.com',
    downloads: '9.6k',
    downloadsValue: 9600,
    publishedAt: '2026-04-18',
    description: '演示：订阅 RSS 源并自动推送到群聊或私聊。'
  },
  {
    id: 'ai-chat',
    name: 'AI Chat',
    author: 'Shiro Labs',
    version: '0.6.0',
    category: 'AI',
    source: 'shirobot hub',
    downloads: '31k',
    downloadsValue: 31000,
    publishedAt: '2026-06-10',
    description: '演示：接入大模型，实现群聊问答、总结和角色对话。'
  }
]

function clone<T>(value: T): T {
  return structuredClone(value)
}

function methodOf(init?: RequestInit) {
  return (init?.method ?? 'GET').toUpperCase()
}

export async function getDemoApiResponse<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, 'https://demo.shirobot.local')
  const method = methodOf(init)
  const pathname = url.pathname

  if (method === 'GET' && pathname === '/api/dashboard/overview') return clone(demoOverview) as T
  if (method === 'GET' && pathname === '/api/plugins') return clone(demoPlugins) as T

  const pluginStateMatch = pathname.match(/^\/api\/plugins\/([^/]+)\/state$/)
  if (method === 'PUT' && pluginStateMatch) {
    const plugin = demoPlugins.find(item => item.id === decodeURIComponent(pluginStateMatch[1] ?? ''))
    if (!plugin) throw new Error('Demo plugin not found')
    const payload = init?.body ? JSON.parse(String(init.body)) as { enabled?: boolean } : {}
    plugin.status = payload.enabled ? 'enabled' : 'disabled'
    return clone(plugin) as T
  }

  if (method === 'POST' && pathname === '/v1/plugins/upload') {
    return clone({ status: 'parsed', message: '演示模式：插件包已提交解析。' } satisfies PluginUploadResponse) as T
  }

  if (method === 'GET' && /^\/api\/plugins\/[^/]+\/config$/.test(pathname)) return clone(demoPluginConfig) as T
  if (method === 'PUT' && /^\/api\/plugins\/[^/]+\/config$/.test(pathname)) {
    return JSON.parse(String(init?.body ?? '{}')) as T
  }

  if (method === 'GET' && pathname === '/api/adapters') return clone(demoAdapters) as T
  if (method === 'GET' && pathname === '/api/config') return clone(demoConfig) as T
  if (method === 'PUT' && pathname === '/api/config') return JSON.parse(String(init?.body ?? '{}')) as T

  if (method === 'GET' && pathname === '/api/runtime/logs') {
    const response: RuntimeLogsResponse = { logs: clone(demoLogs), nextCursor: undefined }
    return response as T
  }

  if (method === 'GET' && pathname === '/api/plugin-market/plugins') return clone(demoMarketplacePlugins) as T

  throw new Error(`Demo endpoint not implemented: ${method} ${pathname}`)
}
