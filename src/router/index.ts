import { createRouter, createWebHistory } from 'vue-router'
import { hasDashboardSession } from '../auth/session'
import { autoSignIn } from '../auth/signIn'
import {
  loadAboutPage,
  loadAdaptersPage,
  loadConfigPage,
  loadLoginPage,
  loadLogsPage,
  loadOverviewPage,
  loadPluginConfigPage,
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
          path: 'plugins/:pluginId/config',
          name: 'PluginConfig',
          component: loadPluginConfigPage
        },
        {
          path: 'adapters',
          name: 'Adapters',
          component: loadAdaptersPage
        },
        {
          // Same config editor as plugins, without routes
          path: 'adapters/:adapterId/config',
          name: 'AdapterConfig',
          component: loadPluginConfigPage
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
  const isPublicRoute = Boolean(to.meta.public)
  // Picking another backend (?switch / ?add / ?backend) or landing after an expiry is deliberate: no auto sign-in.
  const deliberateLogin = to.name === 'Login'
    && ['switch', 'add', 'backend', 'expired'].some(key => to.query[key] !== undefined)
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
