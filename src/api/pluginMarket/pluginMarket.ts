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
  schemaVersion: number | string | null
  generatedAt: string | null
  plugins: MarketplacePlugin[]
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asNullableString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function asNullableNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeMarketplacePlugin(value: unknown): MarketplacePlugin {
  const plugin = asRecord(value)
  const compatibility = asRecord(plugin.compatibility)
  const release = asRecord(plugin.release)
  const assetSource = asRecord(release.asset)
  const health = asRecord(plugin.health)
  const installedSource = asRecord(plugin.installed)
  const authors = Array.isArray(plugin.authors) ? plugin.authors : []
  const platforms = Array.isArray(compatibility.platforms)
    ? compatibility.platforms.filter((item): item is string => typeof item === 'string')
    : undefined
  const hasAsset = Object.keys(assetSource).length > 0
  const hasInstalled = Object.keys(installedSource).length > 0

  return {
    id: asString(plugin.id),
    kind: asString(plugin.kind),
    name: asString(plugin.name, asString(plugin.id, 'Unknown')),
    description: asString(plugin.description),
    category: asString(plugin.category, 'Other'),
    authors: authors.map(author => {
      const item = asRecord(author)
      return { name: asString(item.name, 'Unknown'), url: asNullableString(item.url) ?? undefined }
    }),
    repository: asString(plugin.repository),
    license: asString(plugin.license, 'Unknown'),
    compatibility: {
      shirobot: asString(compatibility.shirobot),
      framework: asString(compatibility.framework),
      platforms
    },
    deprecated: plugin.deprecated === true,
    release: {
      version: asNullableString(release.version),
      prerelease: release.prerelease === true,
      publishedAt: asNullableString(release.publishedAt),
      pageUrl: asNullableString(release.pageUrl),
      downloadCount: asNullableNumber(release.downloadCount),
      asset: hasAsset ? {
        name: asString(assetSource.name),
        url: asString(assetSource.url),
        size: asNullableNumber(assetSource.size) ?? 0,
        digest: asString(assetSource.digest)
      } : null
    },
    health: {
      status: asString(health.status, 'unknown'),
      message: asString(health.message)
    },
    installed: hasInstalled ? {
      version: asString(installedSource.version),
      enabled: installedSource.enabled === true
    } : undefined
  }
}

export async function getPluginMarketPlugins() {
  const response = await apiRequest<unknown>('/api/v1/plugin-market/plugins')
  const root = asRecord(response)
  return {
    schemaVersion: typeof root.schemaVersion === 'number' || typeof root.schemaVersion === 'string' ? root.schemaVersion : null,
    generatedAt: asNullableString(root.generatedAt),
    plugins: Array.isArray(root.plugins) ? root.plugins.map(normalizeMarketplacePlugin) : []
  } satisfies PluginMarketResponse
}
