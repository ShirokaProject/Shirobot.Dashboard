import type { AdapterMarketEntry, AdapterStatus } from '../../api/adapters/adapters'
import { githubRepoOf } from '../plugins/catalogSources.ts'

function repositoryKey(value: string) {
  return (githubRepoOf(value) ?? value.trim()).replace(/\/+$/, '').replace(/\.git$/i, '').toLowerCase()
}

export function findAdapterMarketEntry(adapter: AdapterStatus, entries: AdapterMarketEntry[]) {
  const repository = adapter.repository ? repositoryKey(adapter.repository) : ''
  return entries.find(entry => repository && repositoryKey(entry.repository) === repository)
    ?? entries.find(entry => (!repository || !entry.repository) && entry.id.toLowerCase() === (adapter.packageId || adapter.id).toLowerCase())
    ?? null
}

export function formatAdapterDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN')
}
