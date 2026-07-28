import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// style.css must come AFTER element-plus css so the M3 token bridge wins
import './style.css'
import App from './App.vue'
import router from './router'
import { hasDashboardSession } from './auth/session'
import { preloadDashboardPages } from './router/pageLoaders'
import {
  DEFAULT_COLOR_THEME,
  THEME_STORAGE_KEYS,
  applyColorMode,
  applyColorTheme,
  isColorModeKey,
  isColorThemeKey
} from './theme'

// Bootstrap the dynamic M3 scheme before mount so every page (incl. login)
// gets generated colors instead of the static CSS fallback.
const savedColor = localStorage.getItem(THEME_STORAGE_KEYS.color)
const savedMode = localStorage.getItem(THEME_STORAGE_KEYS.mode)
applyColorTheme(isColorThemeKey(savedColor) ? savedColor : DEFAULT_COLOR_THEME)
if (isColorModeKey(savedMode)) applyColorMode(savedMode)

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
