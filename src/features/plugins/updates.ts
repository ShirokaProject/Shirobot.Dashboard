import { githubRepoOf } from './catalogSources.ts'
import type { MarketplacePlugin } from '../../api/pluginMarket/pluginMarket'
import type { Plugin } from './types'

function normalizeRepository(repository: string) {
  return (githubRepoOf(repository) ?? repository.trim()).replace(/\/+$/, '').replace(/\.git$/i, '').toLowerCase()
}

/** Repository identity takes priority: market IDs may differ from assembly IDs. */
export function findPluginMarketEntry(plugin: Plugin, entries: MarketplacePlugin[]) {
  const repository = plugin.repo ? normalizeRepository(plugin.repo) : ''
  return entries.find(entry => repository && normalizeRepository(entry.repository) === repository)
    ?? entries.find(entry => (!repository || !entry.repository) && entry.id.toLowerCase() === plugin.id.toLowerCase())
    ?? null
}

export function withPluginUpdate(plugin: Plugin, entries: MarketplacePlugin[]): Plugin {
  const entry = findPluginMarketEntry(plugin, entries)
  if (!entry) return plugin
  const version = entry.release.version
  return {
    ...plugin,
    latestVersion: version ?? plugin.version,
    hasUpdate: Boolean(version && compareVersions(version, plugin.version) > 0)
  }
}

export function compareVersions(left: string, right: string) {
  const parse = (value: string) => {
    const normalized = value.trim().replace(/^v(?=\d)/i, '')
    const [main, prerelease = ''] = normalized.split('-', 2)
    const numbers = main.split('.').map(part => Number(part))
    if (!numbers.length || numbers.some(number => !Number.isInteger(number) || number < 0)) return null
    while (numbers.length < 3) numbers.push(0)
    return { numbers, prerelease }
  }
  const a = parse(left)
  const b = parse(right)
  if (!a || !b) return left.localeCompare(right, 'en', { numeric: true })
  for (let index = 0; index < Math.max(a.numbers.length, b.numbers.length); index += 1) {
    const difference = (a.numbers[index] ?? 0) - (b.numbers[index] ?? 0)
    if (difference !== 0) return difference
  }
  if (a.prerelease === b.prerelease) return 0
  if (!a.prerelease) return 1
  if (!b.prerelease) return -1
  return a.prerelease.localeCompare(b.prerelease, 'en', { numeric: true })
}
