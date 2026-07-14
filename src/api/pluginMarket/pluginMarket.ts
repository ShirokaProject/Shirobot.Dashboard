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
}

export function getPluginMarketPlugins() {
  return apiRequest<PluginMarketResponse>('/api/v1/plugin-market/plugins')
}
