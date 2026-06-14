import { createRouter, createWebHistory } from 'vue-router'
import { hasDashboardSession } from '../auth/session'
import {
  loadAboutPage,
  loadAdaptersPage,
  loadConfigPage,
  loadLoginPage,
  loadLogsPage,
  loadOverviewPage,
  loadPluginConfigPage,
  loadPluginMarketPage,
  loadPluginsPage
} from './pageLoaders'

const router = createRouter({
  history: createWebHistory(),
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
          path: 'plugin-market',
          name: 'PluginMarket',
          component: loadPluginMarketPage
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

router.beforeEach(to => {
  const isPublicRoute = Boolean(to.meta.public)
  const hasSession = hasDashboardSession()

  if (!isPublicRoute && !hasSession) {
    return { name: 'Login' }
  }

  if (to.name === 'Login' && hasSession) {
    return '/'
  }

  return true
})

export default router
