import type { AdapterInfo } from './adapters/adapters'
import type { AppConfig } from './config/config'
import type { LogSourceInfo, RuntimeLogsResponse } from './logs/logs'
import type { OverviewResponse } from './overview/overview'
import type { PluginMarketResponse } from './pluginMarket/pluginMarket'
import type { PluginConfigResponse } from './plugins/config'
import type { BackendPlugin, PluginActionDefinition, PluginUploadParsedResponse, PluginUploadResponse } from './plugins/plugins'
import type { RuntimeLog } from '../features/logs/types'

const demoOverview: OverviewResponse = {
  bot_version: 'v0.1.0-demo',
  uptime_seconds: 130320,
  plugins_count: 12,
  adapter: 'OneBot v11',
  adapter_status: 'connected',
  message_count: 1200,
  message_freq: [
    { start_time: '00:00', end_time: '02:00', count: 24 },
    { start_time: '02:00', end_time: '04:00', count: 38 },
    { start_time: '04:00', end_time: '06:00', count: 30 },
    { start_time: '06:00', end_time: '08:00', count: 52 },
    { start_time: '08:00', end_time: '10:00', count: 46 },
    { start_time: '10:00', end_time: '12:00', count: 78 },
    { start_time: '12:00', end_time: '14:00', count: 62 },
    { start_time: '14:00', end_time: '16:00', count: 84 },
    { start_time: '16:00', end_time: '18:00', count: 54 },
    { start_time: '18:00', end_time: '20:00', count: 66 },
    { start_time: '20:00', end_time: '22:00', count: 72 },
    { start_time: '22:00', end_time: '24:00', count: 58 }
  ],
  latest_error: {
    source: 'AI Chat Plugin',
    message: '演示模式：这里展示后端接入后的最近错误格式。',
    time: '2026-06-13 19:08'
  },
  health_status: '正常',
  events: [
    { message: '演示：OneBot v11 连接成功', time: '12:04', level: 'info' },
    { message: '演示：Echo 插件完成热更新', time: '11:40', level: 'info' },
    { message: '演示：Admin 权限缓存刷新', time: '10:18', level: 'info' },
    { message: '演示：Schedule 插件已停用', time: '09:52', level: 'warning' }
  ]
}

const demoPlugins: BackendPlugin[] = [
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
  protocol: 'MilkyAdapter',
  enable_log: true,
  disable_console_input: false,
  github_proxy: 'https://gh-proxy.com/',
  host_update_repository: 'ShirokaProject/ShiroBot',
  avalonia_theme: 'Light',
  owner_list: [1034028486],
  admin_list: [],
  api: {
    enable: true,
    listen_url: 'http://localhost:8080',
    listen_urls: [],
    public_base_url: null,
    auth_enable: true,
    token: 'xxx'
  }
}

const demoPluginConfig: PluginConfigResponse = {
  plugin_id: 'JmParser',
  config: {
    proxy: '',
    output_mode: 'file',
    delete_after_minutes: 60,
    max_concurrency: 16,
    send_cover: true,
    cover_blur_radius: 12
  },
  schema: [
    { key: 'proxy', label: '代理地址', type: 'string', description: '下载请求使用的代理地址，留空表示直连。', placeholder: 'http://127.0.0.1:7890', options: [], min: null, max: null },
    { key: 'output_mode', label: '输出模式', type: 'select', description: 'file 上传 PDF，url 发送临时预览链接，both 两者都发送。', placeholder: null, options: ['file', 'url', 'both'], min: null, max: null },
    { key: 'delete_after_minutes', label: '删除等待分钟', type: 'number', description: '生成文件保留时间。', placeholder: null, options: [], min: 1, max: 1440 },
    { key: 'max_concurrency', label: '最大并发', type: 'number', description: '同时处理的最大任务数量。', placeholder: null, options: [], min: 1, max: 64 },
    { key: 'send_cover', label: '发送封面', type: 'boolean', description: '是否发送封面图片。', placeholder: null, options: [], min: null, max: null },
    { key: 'cover_blur_radius', label: '封面模糊半径', type: 'number', description: '封面图片的模糊强度。', placeholder: null, options: [], min: 0, max: 32 }
  ],
  routes: {
    configured: false,
    mode: 'default',
    groups: [],
    effective_mode: 'blacklist',
    effective_groups: [],
    default_mode: 'blacklist',
    default_groups: []
  }
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

const demoLogSources: LogSourceInfo[] = [
  { source: 'system', description: '系统运行日志', plugin_name: 'system' },
  { source: 'Plugin Loader', description: '插件加载器日志', plugin_name: 'Plugin Loader' },
  { source: 'OneBot v11', description: 'OneBot v11 适配器日志', plugin_name: 'OneBot v11' },
  { source: 'Schedule Plugin', description: 'Schedule 插件日志', plugin_name: 'Schedule Plugin' },
  { source: 'AI Chat Plugin', description: 'AI Chat 插件日志', plugin_name: 'AI Chat Plugin' }
]

const demoMarketplace: PluginMarketResponse = {
  schemaVersion: 1,
  generatedAt: '2026-07-14T08:00:00Z',
  plugins: [
    {
      id: 'weather',
      kind: 'plugin',
      name: 'Weather',
      description: '演示：天气查询、空气质量、灾害预警与城市订阅。',
      category: '工具',
      authors: [{ name: 'Mika', url: 'https://github.com/mika' }],
      repository: 'ShirokaProject/ShiroBot.Plugin.Weather',
      license: 'MIT',
      compatibility: { shirobot: '>=0.1.0', framework: 'net10.0' },
      deprecated: false,
      release: {
        version: '2.3.0',
        prerelease: false,
        publishedAt: '2026-05-28T10:00:00Z',
        pageUrl: 'https://github.com/ShirokaProject/ShiroBot.Plugin.Weather/releases/tag/v2.3.0',
        downloadCount: 18000,
        asset: {
          name: 'ShiroBot.Plugin.Weather.zip',
          url: 'https://github.com/ShirokaProject/ShiroBot.Plugin.Weather/releases/download/v2.3.0/ShiroBot.Plugin.Weather.zip',
          size: 245760,
          digest: `sha256:${'1'.repeat(64)}`
        }
      },
      health: { status: 'available', message: 'Release 与插件清单校验通过。' }
    },
    {
      id: 'rss',
      kind: 'plugin',
      name: 'RSS Hub',
      description: '演示：订阅 RSS 源并自动推送到群聊或私聊。',
      category: '订阅',
      authors: [{ name: 'Community', url: 'https://github.com/ShirokaProject' }],
      repository: 'ShirokaProject/ShiroBot.Plugin.Rss',
      license: 'GPL-3.0',
      compatibility: { shirobot: '>=0.1.0', framework: 'net10.0' },
      deprecated: false,
      release: {
        version: '1.4.2',
        prerelease: false,
        publishedAt: '2026-04-18T08:30:00Z',
        pageUrl: 'https://github.com/ShirokaProject/ShiroBot.Plugin.Rss/releases/tag/v1.4.2',
        downloadCount: 9600,
        asset: {
          name: 'ShiroBot.Plugin.Rss.dll',
          url: 'https://github.com/ShirokaProject/ShiroBot.Plugin.Rss/releases/download/v1.4.2/ShiroBot.Plugin.Rss.dll',
          size: 132096,
          digest: `sha256:${'2'.repeat(64)}`
        }
      },
      health: { status: 'available', message: 'Release 与插件清单校验通过。' }
    },
    {
      id: 'ai-chat',
      kind: 'plugin',
      name: 'AI Chat',
      description: '演示：接入大模型，实现群聊问答、总结和角色对话。',
      category: 'AI',
      authors: [{ name: 'Shiro Labs', url: 'https://github.com/ShirokaProject' }],
      repository: 'ShirokaProject/ShiroBot.Plugin.AIChat',
      license: 'Apache-2.0',
      compatibility: { shirobot: '>=0.1.0', framework: 'net10.0' },
      deprecated: false,
      release: {
        version: '0.7.0',
        prerelease: false,
        publishedAt: '2026-06-10T14:20:00Z',
        pageUrl: 'https://github.com/ShirokaProject/ShiroBot.Plugin.AIChat/releases/tag/v0.7.0',
        downloadCount: 31000,
        asset: {
          name: 'ShiroBot.Plugin.AIChat.zip',
          url: 'https://github.com/ShirokaProject/ShiroBot.Plugin.AIChat/releases/download/v0.7.0/ShiroBot.Plugin.AIChat.zip',
          size: 524288,
          digest: `sha256:${'3'.repeat(64)}`
        }
      },
      health: { status: 'available', message: 'Release、资源和兼容性声明均有效。' },
      installed: { version: '0.6.0', enabled: false }
    }
  ]
}

const demoPendingGithubInstalls = new Map<string, PluginUploadParsedResponse>()

function clone<T>(value: T): T {
  return structuredClone(value)
}

function methodOf(init?: RequestInit) {
  return (init?.method ?? 'GET').toUpperCase()
}

function createDemoPluginActions(plugin: BackendPlugin): PluginActionDefinition[] {
  const actions: PluginActionDefinition[] = [
    {
      id: 'reload',
      label: '重新加载',
      description: '卸载并重新加载当前插件。',
      tone: 'neutral',
      requires_confirmation: false,
      confirmation_text: ''
    }
  ]

  if (plugin.hasUpdate) {
    actions.unshift({
      id: 'update',
      label: '更新插件',
      description: `更新到 v${plugin.latestVersion ?? plugin.version}。`,
      tone: 'primary',
      requires_confirmation: true,
      confirmation_text: `确定将 ${plugin.name} 更新到 v${plugin.latestVersion ?? plugin.version} 吗？`
    })
  }

  actions.push({
    id: 'uninstall',
    label: '卸载插件',
    description: '移除插件文件和当前加载实例。',
    tone: 'danger',
    requires_confirmation: true,
    confirmation_text: `确定卸载 ${plugin.name} 吗？此操作无法撤销。`
  })
  return actions
}

export async function getDemoApiResponse<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, 'https://demo.shirobot.local')
  const method = methodOf(init)
  const pathname = url.pathname

  if (method === 'GET' && pathname === '/api/v1/overview') return clone(demoOverview) as T
  if (method === 'GET' && pathname === '/api/v1/plugins/list') return clone(demoPlugins) as T

  const pluginActionMatch = pathname.match(/^\/api\/v1\/plugins\/([^/]+)\/(enable|disable)$/)
  if (method === 'POST' && pluginActionMatch) {
    const plugin = demoPlugins.find(item => item.id === decodeURIComponent(pluginActionMatch[1] ?? ''))
    if (!plugin) throw new Error('Demo plugin not found')
    const action = pluginActionMatch[2]

    if (action === 'enable') plugin.status = 'enabled'
    if (action === 'disable') plugin.status = 'disabled'
    plugin.enable = action === 'enable'
    const marketPlugin = demoMarketplace.plugins.find(item => item.id === plugin.id)
    if (marketPlugin?.installed) marketPlugin.installed.enabled = action === 'enable'

    return { ok: true, message: `Plugin ${plugin.id} ${action}d.` } as T
  }

  const pluginHostActionMatch = pathname.match(/^\/api\/v1\/plugins\/([^/]+)\/(update|delete)$/)
  if (method === 'POST' && pluginHostActionMatch) {
    const plugin = demoPlugins.find(item => item.id === decodeURIComponent(pluginHostActionMatch[1] ?? ''))
    if (!plugin) throw new Error('Demo plugin not found')
    const action = pluginHostActionMatch[2]
    if (action === 'update') {
      plugin.version = plugin.latestVersion ?? plugin.version
      plugin.hasUpdate = false
      return { ok: true, message: `${plugin.name} 已更新。` } as T
    }

    demoPlugins.splice(demoPlugins.indexOf(plugin), 1)
    const marketPlugin = demoMarketplace.plugins.find(item => item.id === plugin.id)
    if (marketPlugin) delete marketPlugin.installed
    return { ok: true, message: `${plugin.name} 已卸载。` } as T
  }

  const pluginActionsMatch = pathname.match(/^\/api\/v1\/plugins\/([^/]+)\/actions$/)
  if (method === 'GET' && pluginActionsMatch) {
    const plugin = demoPlugins.find(item => item.id === decodeURIComponent(pluginActionsMatch[1] ?? ''))
    if (!plugin) throw new Error('Demo plugin not found')
    return { actions: createDemoPluginActions(plugin) } as T
  }

  const runPluginActionMatch = pathname.match(/^\/api\/v1\/plugins\/([^/]+)\/actions\/([^/]+)$/)
  if (method === 'POST' && runPluginActionMatch) {
    const plugin = demoPlugins.find(item => item.id === decodeURIComponent(runPluginActionMatch[1] ?? ''))
    if (!plugin) throw new Error('Demo plugin not found')
    const actionId = decodeURIComponent(runPluginActionMatch[2] ?? '')

    if (actionId === 'update' && plugin.latestVersion) {
      plugin.version = plugin.latestVersion
      plugin.hasUpdate = false
      const marketPlugin = demoMarketplace.plugins.find(item => item.id === plugin.id)
      if (marketPlugin?.installed) marketPlugin.installed.version = plugin.version
    }
    if (actionId === 'uninstall') {
      demoPlugins.splice(demoPlugins.indexOf(plugin), 1)
      const marketPlugin = demoMarketplace.plugins.find(item => item.id === plugin.id)
      if (marketPlugin) delete marketPlugin.installed
    }

    return { ok: true, message: `${plugin.name}：${actionId} 已完成。`, refresh: true } as T
  }

  if (method === 'POST' && pathname === '/api/v1/plugins/upload') {
    return clone({
      upload_id: 'demo-upload-id',
      status: 'parsed',
      plugin: {
        id: 'GithubView',
        name: 'Github 预览插件',
        version: '1.0.0',
        enable: true,
        author: 'greepar',
        repo: 'greepar/ShiroBot.Plugin.GithubView',
        description: '解析 GitHub 仓库链接并渲染相关信息卡片。',
        category: 'Development'
      },
      package: {
        file_name: 'ShiroBot.Plugin.GithubView.dll',
        type: 'dll',
        size: 123456
      },
      conflict: {
        exists: true,
        installed_version: '1.0.0',
        uploaded_version: '1.0.0',
        action: 'replace'
      }
    } satisfies PluginUploadResponse) as T
  }

  if (method === 'POST' && pathname === '/api/v1/plugins/install/github') {
    const payload = JSON.parse(String(init?.body ?? '{}')) as { repository?: string }
    const marketPlugin = demoMarketplace.plugins.find(plugin => plugin.repository === payload.repository)
    if (!marketPlugin) throw new Error('演示目录中未找到该 GitHub 仓库。')
    if (!marketPlugin.release.version || !marketPlugin.release.pageUrl || !marketPlugin.release.asset) {
      throw new Error('演示目录项没有可安装资源。')
    }

    const installed = demoPlugins.find(plugin => plugin.id === marketPlugin.id)
    const uploadId = `demo-github-${marketPlugin.id}`
    const preview: PluginUploadParsedResponse = {
      upload_id: uploadId,
      status: 'parsed',
      source: {
        type: 'github',
        repository: marketPlugin.repository,
        release_name: `v${marketPlugin.release.version}`,
        release_version: marketPlugin.release.version,
        release_url: marketPlugin.release.pageUrl,
        asset_name: marketPlugin.release.asset.name,
        asset_type: marketPlugin.release.asset.name.endsWith('.zip') ? 'zip' : 'dll'
      },
      plugin: {
        id: marketPlugin.id,
        name: marketPlugin.name,
        version: marketPlugin.release.version,
        author: marketPlugin.authors.map(author => author.name).join(', '),
        repo: marketPlugin.repository,
        description: marketPlugin.description,
        category: marketPlugin.category
      },
      package: {
        file_name: marketPlugin.release.asset.name,
        type: marketPlugin.release.asset.name.endsWith('.zip') ? 'zip' : 'dll',
        size: marketPlugin.release.asset.size
      },
      conflict: {
        exists: Boolean(installed),
        installed_version: installed?.version,
        uploaded_version: marketPlugin.release.version,
        action: installed ? 'replace' : 'install'
      }
    }
    demoPendingGithubInstalls.set(uploadId, preview)
    return clone(preview) as T
  }

  const confirmUploadMatch = pathname.match(/^\/api\/v1\/plugins\/upload\/([^/]+)\/confirm$/)
  if (method === 'POST' && confirmUploadMatch) {
    const uploadId = decodeURIComponent(confirmUploadMatch[1] ?? '')
    const pendingInstall = demoPendingGithubInstalls.get(uploadId)
    if (pendingInstall) {
      const payload = JSON.parse(String(init?.body ?? '{}')) as { enable?: boolean }
      const existing = demoPlugins.find(plugin => plugin.id === pendingInstall.plugin.id)
      const installedPlugin: BackendPlugin = {
        ...pendingInstall.plugin,
        enable: payload.enable ?? true,
        status: payload.enable === false ? 'disabled' : 'enabled',
        latestVersion: pendingInstall.plugin.version,
        hasUpdate: false,
        permissions: [],
        history: [{ version: pendingInstall.plugin.version, date: '2026-07-14' }]
      }
      if (existing) Object.assign(existing, installedPlugin)
      else demoPlugins.push(installedPlugin)

      const marketPlugin = demoMarketplace.plugins.find(plugin => plugin.id === pendingInstall.plugin.id)
      if (marketPlugin) {
        marketPlugin.installed = { version: pendingInstall.plugin.version, enabled: installedPlugin.status === 'enabled' }
      }
      demoPendingGithubInstalls.delete(uploadId)
      return { success: true, plugin: { id: pendingInstall.plugin.id, enable: installedPlugin.status === 'enabled' } } as T
    }
    return { success: true, plugin: { id: 'GithubView', enable: true } } as T
  }

  const cancelUploadMatch = pathname.match(/^\/api\/v1\/plugins\/upload\/([^/]+)$/)
  if (method === 'DELETE' && cancelUploadMatch) {
    demoPendingGithubInstalls.delete(decodeURIComponent(cancelUploadMatch[1] ?? ''))
    return { success: true } as T
  }

  if (method === 'GET' && /^\/api\/v1\/plugins\/[^/]+\/config$/.test(pathname)) return clone(demoPluginConfig) as T
  if (method === 'PATCH' && /^\/api\/v1\/plugins\/[^/]+\/config$/.test(pathname)) {
    const payload = JSON.parse(String(init?.body ?? '{}')) as { config?: typeof demoPluginConfig.config; routes?: { mode?: string; groups?: number[] } }
    if (payload.config) demoPluginConfig.config = { ...demoPluginConfig.config, ...payload.config }
    if (payload.routes) {
      demoPluginConfig.routes = {
        ...demoPluginConfig.routes,
        configured: true,
        mode: payload.routes.mode ?? demoPluginConfig.routes.mode,
        groups: payload.routes.groups ?? demoPluginConfig.routes.groups,
        effective_mode: payload.routes.mode === 'default' ? demoPluginConfig.routes.default_mode : payload.routes.mode ?? demoPluginConfig.routes.effective_mode,
        effective_groups: payload.routes.mode === 'default' ? demoPluginConfig.routes.default_groups : payload.routes.groups ?? demoPluginConfig.routes.effective_groups
      }
    }
    return clone({
      ok: true,
      plugin_id: demoPluginConfig.plugin_id,
      config: demoPluginConfig.config,
      routes: demoPluginConfig.routes
    }) as T
  }

  if (method === 'GET' && pathname === '/api/v1/adapters') return clone(demoAdapters) as T
  if (method === 'GET' && pathname === '/api/v1/config') return clone(demoConfig) as T
  if (method === 'PATCH' && pathname === '/api/v1/config') {
    const payload = JSON.parse(String(init?.body ?? '{}')) as Partial<AppConfig>
    Object.assign(demoConfig, payload)
    if (payload.api) demoConfig.api = { ...demoConfig.api, ...payload.api }
    return { ok: true, msg: '配置更新成功' } as T
  }

  if (method === 'GET' && pathname === '/api/v1/runtime/logs') {
    const response: RuntimeLogsResponse = { logs: clone(demoLogs), nextCursor: undefined }
    return response as T
  }

  if (method === 'GET' && pathname === '/api/v1/logs/sources') return clone(demoLogSources) as T

  if (method === 'GET' && pathname === '/api/v1/plugin-market/plugins') return clone(demoMarketplace) as T

  throw new Error(`Demo endpoint not implemented: ${method} ${pathname}`)
}
