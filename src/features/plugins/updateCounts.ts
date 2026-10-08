import { computed, shallowRef } from 'vue'
import type { Plugin } from './types'
import type { MarketplacePlugin } from '../../api/pluginMarket/pluginMarket'
import type { AdapterMarketEntry } from '../../api/adapters/adapters'
import type { HostUpdateCheck } from '../../api/system/system'
import { compareVersions, withPluginUpdate } from './updates.ts'

export const installedPluginSnapshot = shallowRef<Plugin[]>([])
export const pluginMarketSnapshot = shallowRef<MarketplacePlugin[]>([])
export const adapterMarketSnapshot = shallowRef<AdapterMarketEntry[]>([])

export const pluginUpdateCount = computed(() => installedPluginSnapshot.value
  .filter(plugin => withPluginUpdate(plugin, pluginMarketSnapshot.value).hasUpdate).length)
// Market entries represent packages, so multiple instances count as one update.
export const adapterUpdateCount = computed(() => adapterMarketSnapshot.value
  .filter(entry => entry.installedVersion && compareVersions(entry.version, entry.installedVersion) > 0).length)

export const hostUpdateSnapshot = shallowRef<HostUpdateCheck | null>(null)
export const hostUpdateCount = computed(() => hostUpdateSnapshot.value?.update_available ? 1 : 0)
