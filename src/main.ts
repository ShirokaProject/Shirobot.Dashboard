import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { hasDashboardSession } from './auth/session'
import { preloadDashboardPages } from './router/pageLoaders'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

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
