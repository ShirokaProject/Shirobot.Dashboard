import { apiRequest } from '../core/http'

export type MarketSortKey = 'downloads' | 'publishedAt' | 'name'

export interface PluginMarketAuthor {
  name: string
  url?: string
}

export interface PluginMarketReleaseAsset {
  name: string
  url: string
  size: number
  digest: string
}

export interface PluginMarketRelease {
  version: string | null
  prerelease: boolean
  publishedAt: string | null
  pageUrl: string | null
  downloadCount: number | null
  asset: PluginMarketReleaseAsset | null
}

export interface PluginMarketHealth {
  status: string
  message: string
}

export interface PluginMarketInstalledState {
  version: string
  enabled: boolean
}

export interface PluginMarketCompatibility {
  shirobot: string
  framework: string
  platforms?: string[]
}

export interface MarketplacePlugin {
  id: string
  kind: string
  name: string
  description: string
  category: string
  authors: PluginMarketAuthor[]
  repository: string
  license: string
  compatibility: PluginMarketCompatibility
  deprecated: boolean
  release: PluginMarketRelease
  health: PluginMarketHealth
  installed?: PluginMarketInstalledState
}

export interface PluginMarketResponse {
  schemaVersion: number
  generatedAt: string
  plugins: MarketplacePlugin[]
  /** Where the catalog actually came from, when the backend reports it. */
  source?: { name?: string; repository?: string; url?: string }
}

/**
 * Resolve one plugin repository (GitHub, Gitea, …) that isn't in any catalog. The backend
 * checks it against the Shirobot release rules and returns a catalog-shaped entry; when the
 * repo doesn't qualify, `health.status` is not `available` and `health.message` says why.
 */
export function resolveRepositoryPlugin(repository: string) {
  return apiRequest<MarketplacePlugin>(`/api/v1/plugin-market/resolve?repository=${encodeURIComponent(repository)}`)
}

/**
 * @param source '' for the backend's default (official) catalog, otherwise a third-party
 *   `owner/repo` or catalog URL, forwarded as `?source=`.
 */
export function getPluginMarketPlugins(forceRefresh = false, source = '') {
  const params = new URLSearchParams()
  if (source) params.set('source', source)
  if (forceRefresh) params.set('refresh', '1')
  const query = params.toString()
  return apiRequest<PluginMarketResponse>(`/api/v1/plugin-market/plugins${query ? `?${query}` : ''}`)
}
