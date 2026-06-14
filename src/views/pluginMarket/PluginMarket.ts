import { computed, onMounted, ref, watch } from 'vue'
import { getPluginMarketPlugins, type MarketplacePlugin, type MarketSortKey, type MarketSource } from '../../api'

export function usePluginMarketPage() {
  const keyword = ref('')
  const activeCategory = ref('全部')
  const activeSource = ref<MarketSource>('github.com')
  const activeSort = ref<MarketSortKey>('downloads')
  const loadError = ref('')

  const sourceOptions: MarketSource[] = ['github.com', 'shirobot hub']
  const sortOptions: Array<{ label: string; value: MarketSortKey }> = [
    { label: '下载数量', value: 'downloads' },
    { label: '发布时间', value: 'publishedAt' },
    { label: 'A-z', value: 'name' }
  ]

  const marketplacePlugins = ref<MarketplacePlugin[]>([])

  const sourcePlugins = computed(() => marketplacePlugins.value.filter(plugin => plugin.source === activeSource.value))

  const categories = computed(() => ['全部', ...new Set(sourcePlugins.value.map(plugin => plugin.category))])

  const filteredPlugins = computed(() => {
    const query = keyword.value.trim().toLowerCase()
    const filtered = sourcePlugins.value.filter(plugin => {
      const matchCategory = activeCategory.value === '全部' || plugin.category === activeCategory.value
      const matchKeyword = !query || [plugin.name, plugin.author, plugin.category, plugin.source, plugin.description]
        .some(value => value.toLowerCase().includes(query))
      return matchCategory && matchKeyword
    })

    return [...filtered].sort((left, right) => {
      if (activeSort.value === 'downloads') return right.downloadsValue - left.downloadsValue
      if (activeSort.value === 'publishedAt') return right.publishedAt.localeCompare(left.publishedAt)
      return left.name.localeCompare(right.name, 'en', { sensitivity: 'base' })
    })
  })

  async function loadMarketplacePlugins() {
    loadError.value = ''
    try {
      marketplacePlugins.value = await getPluginMarketPlugins({
        source: activeSource.value,
        keyword: keyword.value.trim(),
        category: activeCategory.value,
        sort: activeSort.value
      })
    } catch (error) {
      marketplacePlugins.value = []
      loadError.value = '后端插件市场接口暂不可用，请接入 /api/plugin-market/plugins 后刷新。'
      void error
    }
  }

  onMounted(() => {
    void loadMarketplacePlugins()
  })

  watch([activeSource, activeSort], () => {
    void loadMarketplacePlugins()
  })

  return {
    keyword,
    activeCategory,
    activeSource,
    activeSort,
    loadError,
    sourceOptions,
    sortOptions,
    categories,
    filteredPlugins
  }
}
