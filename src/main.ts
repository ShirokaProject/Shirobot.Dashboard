import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// style.css must come AFTER element-plus css so the M3 token bridge wins
import './style.css'
import App from './App.vue'
import router from './router'
import { hasDashboardSession } from './auth/session'
import { preloadDashboardPages } from './router/pageLoaders'

const app = createApp(App)
app.use(router)
app.use(ElementPlus)
app.mount('#app')

const preloadPagesWhenIdle = () => {
  if (hasDashboardSession()) {
    void preloadDashboardPages()
  }
}

if ('requestIdleCallback' in window) {
  window.requestIdleCallback(preloadPagesWhenIdle, { timeout: 2200 })
} else {
  globalThis.setTimeout(preloadPagesWhenIdle, 900)
}
