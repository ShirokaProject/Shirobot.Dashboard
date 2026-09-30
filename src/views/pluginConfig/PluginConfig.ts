import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePluginConfig, type ConfigTarget } from './usePluginConfig'

/**
 * Full config page: the same editor as the workspace dialog. Serves both
 * /plugins/:pluginId/config and /adapters/:adapterId/config.
 */
export function usePluginConfigPage() {
  const route = useRoute()
  // Reactive: the workspace switches between plugins and adapters without remounting.
  const target = computed<ConfigTarget>(() => route.params.adapterId ? 'adapter' : 'plugin')
  const pluginId = computed(() => String(route.params.adapterId ?? route.params.pluginId ?? ''))
  return { pluginId, target, ...usePluginConfig(pluginId, target) }
}
