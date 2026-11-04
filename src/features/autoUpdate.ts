import { reactive } from 'vue'
import { getApiErrorMessage, getAppConfig, updateAppConfig } from '../api'
import { toastError } from './toast'

export type AutoUpdateKind = 'plugins' | 'adapters'

const ENABLED_KEY: Record<AutoUpdateKind, string> = { plugins: 'auto_update_plugins', adapters: 'auto_update_adapters' }
const EXCLUDE_KEY: Record<AutoUpdateKind, string> = { plugins: 'auto_update_exclude_plugins', adapters: 'auto_update_exclude_adapters' }

/**
 * The host's auto-update switches, shared by the shortcut on the plugins / adapters pages and the per-item switch in
 * their detail panes. Every change is written straight to the core config, the same keys the 配置中心 edits.
 */
export const autoUpdate = reactive({
  /** The host has auto-update at all; older hosts lack the keys and the shortcuts stay hidden */
  available: false,
  /** The host can exclude single plugins / adapters */
  exclusions: false,
  time: '02:00',
  enabled: { plugins: false, adapters: false } as Record<AutoUpdateKind, boolean>,
  excluded: { plugins: [], adapters: [] } as Record<AutoUpdateKind, string[]>,
  saving: false
})

let loading: Promise<void> | null = null

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/** Reads the settings once per page load; pass force after the 配置中心 may have changed them. */
export function loadAutoUpdate(force = false): Promise<void> {
  if (loading && !force) return loading
  loading = (async () => {
    try {
      const { config } = await getAppConfig()
      if (typeof config?.auto_update_plugins !== 'boolean') return
      autoUpdate.available = true
      autoUpdate.exclusions = Array.isArray(config.auto_update_exclude_plugins)
      autoUpdate.enabled.plugins = config.auto_update_plugins
      autoUpdate.enabled.adapters = config.auto_update_adapters === true
      autoUpdate.excluded.plugins = stringList(config.auto_update_exclude_plugins)
      autoUpdate.excluded.adapters = stringList(config.auto_update_exclude_adapters)
      if (typeof config.auto_update_time === 'string' && config.auto_update_time) autoUpdate.time = config.auto_update_time
    } catch {
      // The pages work without it; the 配置中心 shows the real error
      loading = null
    }
  })()
  return loading
}

async function save(patch: Record<string, unknown>, apply: () => void) {
  autoUpdate.saving = true
  try {
    await updateAppConfig(patch)
    apply()
  } catch (error) {
    toastError(getApiErrorMessage(error, '保存自动更新设置失败'))
  } finally {
    autoUpdate.saving = false
  }
}

export function setAutoUpdateEnabled(kind: AutoUpdateKind, value: boolean) {
  return save({ [ENABLED_KEY[kind]]: value }, () => { autoUpdate.enabled[kind] = value })
}

export function isAutoUpdateExcluded(kind: AutoUpdateKind, id: string) {
  return autoUpdate.excluded[kind].some(item => item.toLowerCase() === id.toLowerCase())
}

/** Turns automatic updates on or off for one plugin or adapter package. */
export function setAutoUpdateIncluded(kind: AutoUpdateKind, id: string, included: boolean) {
  const rest = autoUpdate.excluded[kind].filter(item => item.toLowerCase() !== id.toLowerCase())
  const next = included ? rest : [...rest, id]
  return save({ [EXCLUDE_KEY[kind]]: next }, () => { autoUpdate.excluded[kind] = next })
}
