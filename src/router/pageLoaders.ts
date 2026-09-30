const routeComponentLoaders = {
  '/': () => import('../views/overview/Overview.vue'),
  '/login': () => import('../views/login/Login.vue'),
  // 插件 hub: installed + catalog as two tabs of one page
  '/plugins': () => import('../views/plugins/PluginsHub.vue'),
  '/plugins/:pluginId/config': () => import('../views/pluginConfig/PluginConfig.vue'),
  // Adapter hub: installed + catalog as two tabs of one page
  '/adapters': () => import('../views/adapters/AdaptersHub.vue'),
  '/logs': () => import('../views/logs/Logs.vue'),
  '/config': () => import('../views/config/Config.vue'),
  '/about': () => import('../views/about/About.vue')
} as const

type RouteComponentPath = keyof typeof routeComponentLoaders

const preloadCache = new Map<RouteComponentPath, Promise<unknown>>()

function resolvePreloadPath(path: string): RouteComponentPath | null {
  const cleanPath = path.split('?')[0]?.replace(/\/$/, '') || '/'

  if (cleanPath === '') return '/'
  if (/^\/(plugins|adapters)\/[^/]+\/config$/.test(cleanPath)) return '/plugins/:pluginId/config'

  return cleanPath in routeComponentLoaders ? cleanPath as RouteComponentPath : null
}

function preloadByKey(path: RouteComponentPath) {
  const cached = preloadCache.get(path)
  if (cached) return cached

  const promise = routeComponentLoaders[path]().catch(error => {
    preloadCache.delete(path)
    throw error
  })
  preloadCache.set(path, promise)
  return promise
}

export function loadLoginPage() {
  return preloadByKey('/login')
}

export function loadOverviewPage() {
  return preloadByKey('/')
}

export function loadPluginsPage() {
  return preloadByKey('/plugins')
}

export function loadPluginConfigPage() {
  return preloadByKey('/plugins/:pluginId/config')
}

export function loadAdaptersPage() {
  return preloadByKey('/adapters')
}

export function loadLogsPage() {
  return preloadByKey('/logs')
}

export function loadConfigPage() {
  return preloadByKey('/config')
}

export function loadAboutPage() {
  return preloadByKey('/about')
}

export function preloadRouteComponent(path: string) {
  const resolvedPath = resolvePreloadPath(path)
  return resolvedPath ? preloadByKey(resolvedPath) : Promise.resolve(null)
}

export function preloadDashboardPages() {
  const preloadOrder: RouteComponentPath[] = [
    '/plugins',
    '/logs',
    '/adapters',
    '/config',
    '/about',
    '/plugins/:pluginId/config'
  ]

  return Promise.allSettled(preloadOrder.map(path => preloadByKey(path)))
}
