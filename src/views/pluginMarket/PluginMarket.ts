import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import {
  cancelPluginUpload,
  confirmPluginUpload,
  getApiErrorMessage,
  getPluginMarketPlugins,
  prepareGithubPluginInstall,
  type MarketplacePlugin,
  type MarketSortKey,
  type PluginMarketResponse,
  type PluginUploadParsedResponse
} from '../../api'

const DAY_MS = 86_400_000
const PAGE_SIZE = 6

const safeDownloads = (plugin: MarketplacePlugin) =>
  Number.isFinite(plugin.release.downloadCount) && plugin.release.downloadCount! > 0
    ? plugin.release.downloadCount!
    : 0

const dateMs = (value: string | null) => {
  if (!value) return 0
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

const comparePluginNames = (left: MarketplacePlugin, right: MarketplacePlugin) =>
  left.name.localeCompare(right.name, 'zh-CN', { sensitivity: 'base' }) || left.id.localeCompare(right.id)

export function usePluginMarketPage() {
  const keyword = ref('')
  const activeCategory = ref('全部')
  const activeSort = ref<MarketSortKey>('downloads')
  const loading = ref(false)
  const loadError = ref('')
  const feedbackMessage = ref('')
  const feedbackType = ref<'success' | 'error'>('success')
  const market = ref<PluginMarketResponse | null>(null)
  const selectedPlugin = ref<MarketplacePlugin | null>(null)
  const detailVisible = ref(false)
  const preparingPluginId = ref('')
  const installDialogVisible = ref(false)
  const installPreview = ref<PluginUploadParsedResponse | null>(null)
  const installError = ref('')
  const installConfirming = ref(false)
  const installReplace = ref(false)
  const installEnable = ref(true)
  const currentPage = ref(1)
  let feedbackTimer: ReturnType<typeof setTimeout> | null = null

  function showFeedback(message: string, type: 'success' | 'error') {
    if (feedbackTimer) {
      clearTimeout(feedbackTimer)
      feedbackTimer = null
    }
    feedbackMessage.value = message
    feedbackType.value = type
    if (type === 'success') {
      feedbackTimer = setTimeout(() => {
        feedbackMessage.value = ''
      }, 4000)
    }
  }

  const sortOptions: Array<{ label: string; value: MarketSortKey }> = [
    { label: '下载数量', value: 'downloads' },
    { label: '发布时间', value: 'publishedAt' },
    { label: 'A-z', value: 'name' }
  ]

  const marketplacePlugins = computed(() => market.value?.plugins ?? [])
  const categories = computed(() => ['全部', ...new Set(marketplacePlugins.value.map(plugin => plugin.category).filter(Boolean))])
  const generatedAt = computed(() => market.value?.generatedAt ? formatDate(market.value.generatedAt) : '—')
  const installDialogTitle = computed(() => installPreview.value ? `确认安装 ${installPreview.value.plugin.name}` : '确认安装插件')
  const anchorMs = computed(() => {
    const generatedMs = dateMs(market.value?.generatedAt ?? null)
    if (generatedMs) return generatedMs
    return marketplacePlugins.value.reduce((latest, plugin) => Math.max(latest, dateMs(plugin.release.publishedAt)), 0)
  })

  const recommendedPlugins = computed(() => {
    const eligible = marketplacePlugins.value.filter(plugin => !plugin.deprecated && canInstallPlugin(plugin))
    const maxDownloads = eligible.reduce((maximum, plugin) => Math.max(maximum, safeDownloads(plugin)), 0)
    const ranked = eligible
      .map(plugin => {
        const downloads = safeDownloads(plugin)
        const publishedMs = dateMs(plugin.release.publishedAt)
        const ageDays = anchorMs.value > 0 && publishedMs > 0
          ? Math.max(0, (anchorMs.value - publishedMs) / DAY_MS)
          : 365
        const recencyScore = 1 - Math.min(ageDays, 365) / 365
        const downloadScore = maxDownloads > 0 ? Math.log1p(downloads) / Math.log1p(maxDownloads) : 0
        const stableScore = plugin.release.prerelease ? 0 : 1
        const licenseScore = plugin.license.trim() && plugin.license !== 'Unknown' ? 1 : 0
        return {
          plugin,
          downloads,
          publishedMs,
          score: 0.45 * recencyScore + 0.35 * downloadScore + 0.15 * stableScore + 0.05 * licenseScore
        }
      })
      .sort((left, right) =>
        right.score - left.score
        || right.downloads - left.downloads
        || right.publishedMs - left.publishedMs
        || comparePluginNames(left.plugin, right.plugin)
      )

    const selected: MarketplacePlugin[] = []
    const selectedIds = new Set<string>()
    const selectedCategories = new Set<string>()
    for (const entry of ranked) {
      const category = entry.plugin.category.trim() || 'Other'
      if (selectedCategories.has(category)) continue
      selected.push(entry.plugin)
      selectedIds.add(entry.plugin.id)
      selectedCategories.add(category)
      if (selected.length === 2) return selected
    }
    for (const entry of ranked) {
      if (selectedIds.has(entry.plugin.id)) continue
      selected.push(entry.plugin)
      if (selected.length === 2) break
    }
    return selected
  })

  const popularPlugins = computed(() => marketplacePlugins.value
    .filter(plugin => !plugin.deprecated)
    .sort((left, right) =>
      safeDownloads(right) - safeDownloads(left)
      || Number(left.release.prerelease) - Number(right.release.prerelease)
      || dateMs(right.release.publishedAt) - dateMs(left.release.publishedAt)
      || comparePluginNames(left, right)
    )
    .slice(0, 5))
  const showDiscovery = computed(() => keyword.value.trim() === '' && activeCategory.value === '全部')

  const filteredPlugins = computed(() => {
    const query = keyword.value.trim().toLowerCase()
    const filtered = marketplacePlugins.value.filter(plugin => {
      const matchCategory = activeCategory.value === '全部' || plugin.category === activeCategory.value
      const searchable = [
        plugin.id,
        plugin.kind,
        plugin.name,
        plugin.description,
        plugin.category,
        plugin.repository,
        plugin.license,
        formatCompatibility(plugin),
        plugin.release.version ?? '',
        plugin.health.status,
        plugin.health.message,
        ...plugin.authors.map(author => author.name)
      ]
      return matchCategory && (!query || searchable.some(value => value.toLowerCase().includes(query)))
    })

    return [...filtered].sort((left, right) => {
      if (activeSort.value === 'downloads') return (right.release.downloadCount ?? 0) - (left.release.downloadCount ?? 0)
      if (activeSort.value === 'publishedAt') return (right.release.publishedAt ?? '').localeCompare(left.release.publishedAt ?? '')
      return left.name.localeCompare(right.name, 'en', { sensitivity: 'base' })
    })
  })
  const filteredCount = computed(() => filteredPlugins.value.length)
  const pageCount = computed(() => Math.ceil(filteredCount.value / PAGE_SIZE))
  const pageStart = computed(() => (currentPage.value - 1) * PAGE_SIZE)
  const pagedPlugins = computed(() => filteredPlugins.value.slice(pageStart.value, pageStart.value + PAGE_SIZE))
  const catalogueRange = computed(() => filteredCount.value === 0
    ? '0 / 0'
    : `${pageStart.value + 1}-${Math.min(pageStart.value + PAGE_SIZE, filteredCount.value)} / ${filteredCount.value}`)
  const pageTokens = computed<Array<number | string>>(() => {
    if (pageCount.value <= 7) return Array.from({ length: pageCount.value }, (_, index) => index + 1)
    const pages = new Set([1, pageCount.value, currentPage.value - 1, currentPage.value, currentPage.value + 1])
    if (currentPage.value <= 4) [2, 3, 4].forEach(page => pages.add(page))
    if (currentPage.value >= pageCount.value - 3) {
      [pageCount.value - 3, pageCount.value - 2, pageCount.value - 1].forEach(page => pages.add(page))
    }
    const sorted = [...pages].filter(page => page >= 1 && page <= pageCount.value).sort((left, right) => left - right)
    return sorted.flatMap((page, index) => index > 0 && page - sorted[index - 1]! > 1 ? [`ellipsis-${page}`, page] : [page])
  })

  watch([keyword, activeCategory, activeSort], () => {
    currentPage.value = 1
  }, { flush: 'sync' })

  watch(pageCount, count => {
    currentPage.value = Math.min(Math.max(currentPage.value, 1), Math.max(1, count))
  }, { flush: 'sync' })

  async function setPage(target: number) {
    const nextPage = Math.min(Math.max(target, 1), Math.max(1, pageCount.value))
    if (nextPage === currentPage.value) return
    currentPage.value = nextPage
    await nextTick()
    const heading = document.querySelector<HTMLElement>('#plugin-catalogue-heading')
    heading?.focus({ preventScroll: true })
    heading?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    })
  }

  async function loadMarketplacePlugins() {
    loading.value = true
    loadError.value = ''
    try {
      const response = await getPluginMarketPlugins()
      market.value = response
      if (selectedPlugin.value) {
        selectedPlugin.value = response.plugins.find(plugin => plugin.id === selectedPlugin.value?.id) ?? null
      }
      if (activeCategory.value !== '全部' && !response.plugins.some(plugin => plugin.category === activeCategory.value)) {
        activeCategory.value = '全部'
      }
    } catch (error) {
      if (!market.value) market.value = null
      loadError.value = getApiErrorMessage(error, '插件市场加载失败')
    } finally {
      loading.value = false
    }
  }

  function showPluginDetails(plugin: MarketplacePlugin) {
    selectedPlugin.value = plugin
    detailVisible.value = true
  }

  async function preparePluginInstall(plugin: MarketplacePlugin) {
    if (!canInstallPlugin(plugin) || preparingPluginId.value) return

    if (plugin.installed && compareVersions(plugin.installed.version, plugin.release.version!) > 0) {
      try {
        await ElMessageBox.confirm(
          `已安装版本 ${plugin.installed.version} 高于市场版本 ${plugin.release.version}，继续将执行降级。`,
          '确认降级安装',
          { type: 'warning', confirmButtonText: '继续降级', cancelButtonText: '取消' }
        )
      } catch {
        return
      }
    }

    detailVisible.value = false
    feedbackMessage.value = ''
    installError.value = ''
    preparingPluginId.value = plugin.id
    try {
      const preview = await prepareGithubPluginInstall(plugin.repository, plugin.release.asset!)
      installPreview.value = preview
      installReplace.value = preview.conflict?.exists ? preview.conflict.action === 'replace' : false
      installEnable.value = true
      installDialogVisible.value = true
    } catch (error) {
      showFeedback(getApiErrorMessage(error, '插件安装准备失败'), 'error')
    } finally {
      preparingPluginId.value = ''
    }
  }

  async function setInstallDialogVisible(visible: boolean) {
    installDialogVisible.value = visible
    if (visible || !installPreview.value) return

    const uploadId = installPreview.value.upload_id
    installPreview.value = null
    installError.value = ''
    try {
      await cancelPluginUpload(uploadId)
    } catch (error) {
      console.error('Plugin market preview cleanup failed', error)
    }
  }

  async function confirmMarketInstall() {
    if (!installPreview.value) return

    installConfirming.value = true
    installError.value = ''
    try {
      const response = await confirmPluginUpload(installPreview.value.upload_id, {
        replace: installReplace.value,
        enable: installEnable.value
      })
      if (!response.success) {
        installError.value = '插件安装失败'
        return
      }

      installPreview.value = null
      installDialogVisible.value = false
      showFeedback('插件安装成功', 'success')
      await loadMarketplacePlugins()
    } catch (error) {
      installError.value = getApiErrorMessage(error, '插件确认安装失败')
    } finally {
      installConfirming.value = false
    }
  }

  function formatAuthors(plugin: MarketplacePlugin) {
    return plugin.authors.map(author => author.name).join('、') || 'Unknown'
  }

  function formatDownloads(value: number | null) {
    if (value === null) return '—'
    return new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
  }

  function formatSize(value: number) {
    if (value < 1024) return `${value} B`
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
    return `${(value / 1024 / 1024).toFixed(1)} MB`
  }

  function formatDate(value: string | null) {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value || '—'
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  }

  function healthTone(status: string) {
    const normalized = status.toLowerCase()
    if (['available', 'healthy', 'ok', 'passing', 'normal'].includes(normalized)) return 'healthy'
    if (['warning', 'degraded', 'stale', 'no-release', 'asset-missing', 'asset-ambiguous'].includes(normalized)) return 'warning'
    if (['error', 'unhealthy', 'failed', 'blocked'].includes(normalized)) return 'error'
    return 'unknown'
  }

  function healthLabel(status: string) {
    return {
      healthy: '健康',
      ok: '正常',
      passing: '正常',
      normal: '正常',
      available: '可用',
      warning: '警告',
      degraded: '降级',
      stale: '过期',
      error: '异常',
      unhealthy: '异常',
      failed: '失败',
      blocked: '阻止'
    }[status.toLowerCase()] ?? status
  }

  function installButtonLabel(plugin: MarketplacePlugin) {
    if (preparingPluginId.value === plugin.id) return '准备中...'
    if (!canInstallPlugin(plugin)) return plugin.deprecated ? '已弃用' : '不可安装'
    if (!plugin.installed) return '安装'
    const comparison = compareVersions(plugin.installed.version, plugin.release.version!)
    if (comparison === 0) return '重新安装'
    return comparison > 0 ? '降级安装' : '更新'
  }

  function canInstallPlugin(plugin: MarketplacePlugin) {
    return !plugin.deprecated
      && plugin.health.status === 'available'
      && Boolean(plugin.repository && plugin.release.version && plugin.release.asset?.url && plugin.release.asset.name && plugin.release.asset.digest)
  }

  function formatCompatibility(plugin: MarketplacePlugin) {
    const parts = [plugin.compatibility.shirobot, plugin.compatibility.framework]
    if (plugin.compatibility.platforms?.length) parts.push(plugin.compatibility.platforms.join(', '))
    return parts.filter(Boolean).join(' · ') || '—'
  }

  function compareVersions(left: string, right: string) {
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

  onMounted(() => {
    void loadMarketplacePlugins()
  })

  onBeforeUnmount(() => {
    if (feedbackTimer) clearTimeout(feedbackTimer)
  })

  return {
    keyword,
    loadMarketplacePlugins,
    activeCategory,
    activeSort,
    loading,
    loadError,
    feedbackMessage,
    feedbackType,
    selectedPlugin,
    detailVisible,
    preparingPluginId,
    installDialogVisible,
    installPreview,
    installError,
    installConfirming,
    installReplace,
    installEnable,
    currentPage,
    installDialogTitle,
    sortOptions,
    categories,
    generatedAt,
    marketplacePlugins,
    filteredPlugins,
    filteredCount,
    pageCount,
    pagedPlugins,
    catalogueRange,
    pageTokens,
    recommendedPlugins,
    popularPlugins,
    showDiscovery,
    setPage,
    showPluginDetails,
    preparePluginInstall,
    setInstallDialogVisible,
    confirmMarketInstall,
    formatAuthors,
    formatDownloads,
    safeDownloads,
    formatSize,
    formatDate,
    healthTone,
    healthLabel,
    installButtonLabel,
    canInstallPlugin,
    formatCompatibility
  }
}
