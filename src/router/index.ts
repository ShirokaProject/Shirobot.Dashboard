import { createRouter, createWebHistory } from 'vue-router'
import { hasDashboardSession } from '../auth/session'
import { autoSignIn, markDashboardEntrance, signInFromLink } from '../auth/signIn'
import {
  loadAboutPage,
  loadAdaptersPage,
  loadConfigPage,
  loadLoginPage,
  loadLogsPage,
  loadOverviewPage,
  loadPluginsPage
} from './pageLoaders'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: loadLoginPage,
      meta: { public: true }
    },
    {
      path: '/',
      component: () => import('../layout/MainLayout.vue'),
      children: [
        {
          path: '',
          name: 'Overview',
          component: loadOverviewPage
        },
        {
          path: 'plugins',
          name: 'Plugins',
          component: loadPluginsPage
        },
        {
          // The catalog is now the 发现 tab of the 插件 page; keep old links working.
          path: 'plugin-market',
          redirect: { path: '/plugins', query: { tab: 'discover' } }
        },
        {
          // Config is edited in a window on the 插件 page; keep old links working.
          path: 'plugins/:pluginId/config',
          redirect: to => ({ path: '/plugins', query: { config: String(to.params.pluginId) } })
        },
        {
          path: 'adapters',
          name: 'Adapters',
          component: loadAdaptersPage
        },
        {
          path: 'adapters/:adapterId/config',
          redirect: to => ({ path: '/adapters', query: { config: String(to.params.adapterId) } })
        },
        {
          // The catalog is now the 发现 tab of the Adapter page; keep old links working.
          path: 'adapter-market',
          redirect: { path: '/adapters', query: { tab: 'discover' } }
        },
        {
          path: 'logs',
          name: 'Logs',
          component: loadLogsPage
        },
        {
          path: 'config',
          name: 'Config',
          component: loadConfigPage
        },
        {
          path: 'about',
          name: 'About',
          component: loadAboutPage
        }
      ]
    }
  ]
})

router.beforeEach(async to => {
  // A `?token=` login link from the host: sign in, then replace the entry so the key does not stay
  // in the address bar, history or bookmarks.
  if (typeof to.query.token === 'string') {
    const { token, ...query } = to.query
    const result = await signInFromLink(token)
    if (!result.ok) return { name: 'Login', query: { link_failed: '' }, replace: true }
    markDashboardEntrance()
    return { path: to.name === 'Login' ? '/' : to.path, query, hash: to.hash, replace: true }
  }

  const isPublicRoute = Boolean(to.meta.public)
  // Picking another backend (?switch / ?add / ?backend) or landing after an expiry is deliberate: no auto sign-in.
  const deliberateLogin = to.name === 'Login'
    && ['switch', 'add', 'backend', 'expired', 'link_failed'].some(key => to.query[key] !== undefined)
  const hasSession = hasDashboardSession() || (!deliberateLogin && await autoSignIn())

  if (!isPublicRoute && !hasSession) {
    return { name: 'Login' }
  }

  // `?switch` lets a signed-in user open the login page to pick or add another backend.
  if (to.name === 'Login' && hasSession && to.query.switch === undefined) {
    return '/'
  }

  return true
})

export default router
