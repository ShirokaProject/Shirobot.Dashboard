import { apiRequest } from '../core/http'

export type MarketSource = 'github.com' | 'shirobot hub'
export type MarketSortKey = 'downloads' | 'publishedAt' | 'name'

export interface MarketplacePlugin {
  id: string
  name: string
  author: string
  version: string
  category: string
  source: MarketSource
  downloads: string
  downloadsValue: number
  publishedAt: string
  description: string
}

export interface PluginMarketQuery {
  source?: MarketSource
  keyword?: string
  category?: string
  sort?: MarketSortKey
}

export function getPluginMarketPlugins(query: PluginMarketQuery = {}) {
  const params = new URLSearchParams()

  if (query.source) params.set('source', query.source)
  if (query.keyword) params.set('keyword', query.keyword)
  if (query.category && query.category !== '全部') params.set('category', query.category)
  if (query.sort) params.set('sort', query.sort)

  const search = params.toString()
  return apiRequest<MarketplacePlugin[]>(`/api/v1/plugin-market/plugins${search ? `?${search}` : ''}`)
}
