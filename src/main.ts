import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// style.css must come AFTER element-plus css so the M3 token bridge wins
import './style.css'
import App from './App.vue'
import router from './router'
import { describeUnhandledError, setUnauthorizedHandler } from './api/core/http'
import { toastError } from './features/toast'
import { forgetRememberedKey } from './auth/backends'
import { clearDashboardSession, getDashboardSession, hasDashboardSession } from './auth/session'
import { preloadDashboardPages } from './router/pageLoaders'
import { installBusyGuard } from './features/busy'

// A key the backend no longer accepts ends the session and returns to the login page.
setUnauthorizedHandler(() => {
  const session = getDashboardSession()
  if (!session || session.mode !== 'api') return
  forgetRememberedKey(session.backendId)
  clearDashboardSession()
  void router.replace({ name: 'Login', query: { expired: '', backend: session.backendId } })
})

installBusyGuard()

const app = createApp(App)

// Last resort for a failed request no page handled: without it the failure only reaches the console.
function reportUnhandled(reason: unknown) {
  const message = describeUnhandledError(reason)
  if (message) toastError(message)
}
// Vue keeps errors from hooks and event handlers away from the window, so both paths are needed.
app.config.errorHandler = reason => {
  console.error(reason)
  reportUnhandled(reason)
}
window.addEventListener('unhandledrejection', event => reportUnhandled(event.reason))

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
