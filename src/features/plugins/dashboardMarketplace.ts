import { shallowRef } from 'vue'
import { getPluginMarketPlugins, type PluginMarketResponse } from '../../api/pluginMarket/pluginMarket'
import { getSessionBaseUrl } from '../../auth/session'
import { getActiveCatalogSource } from './catalogSources'

export const dashboardMarketplace = shallowRef<{
  baseUrl: string
  source: string
  response: PluginMarketResponse
} | null>(null)
let refreshGeneration = 0

/** Called once when the authenticated dashboard shell is created. */
export function refreshDashboardMarketplace() {
  const generation = ++refreshGeneration
  const baseUrl = getSessionBaseUrl()
  const source = getActiveCatalogSource().url
  dashboardMarketplace.value = null
  void getPluginMarketPlugins(true, source).then(response => {
    if (generation === refreshGeneration && getSessionBaseUrl() === baseUrl)
      dashboardMarketplace.value = { baseUrl, source, response }
  }).catch(() => {
    // Background refresh must not interrupt navigation; the market page keeps its cache.
  })
}
