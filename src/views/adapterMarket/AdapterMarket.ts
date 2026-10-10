import { compareVersions } from '../../features/plugins/updates'
import { formatAdapterDate } from '../../features/adapters/market'
import { offerRestartForStagedUpdate } from '../../features/hostPower/pendingRestart'
import { computed, onMounted, reactive, ref } from 'vue'
import { cancelAdapterUpload, confirmAdapterUpload, formatPlatform, getAdapterMarketCatalog, getApiErrorMessage, prepareGithubAdapterInstall, resolveRepositoryAdapter } from '../../api'
import type { AdapterInstallPreview, AdapterMarketEntry } from '../../api'
import {
  addCatalogSource,
  addDirectRepo,
  getActiveCatalogSource,
  listCatalogSources,
  listDirectRepos,
  removeCatalogSource,
  removeDirectRepo,
  setActiveCatalogSource,
  type CatalogSource,
  type DirectRepository,
  type ParsedRepository
} from '../../features/plugins/catalogSources'

const SCOPE = 'adapters'

export interface DirectAdapterEntry {
  repo: DirectRepository
  /** Resolved entry; while loading or on network failure a placeholder with that status. */
  entry: AdapterMarketEntry
  loading: boolean
}

/** Stand-in entry so an unresolved repo still renders (and explains itself) in the list. */
function placeholderFor(repo: DirectRepository, health: string, message: string): AdapterMarketEntry {
  return {
    id: `direct:${repo.url}`,
    name: repo.repo,
    version: '—',
    platform: formatPlatform(repo.repo),
    description: message,
    repository: repo.url,
    authors: [repo.owner],
    downloadCount: null,
    installedVersion: null,
    health,
    healthMessage: message
  }
}

export function isInstallableEntry(entry: AdapterMarketEntry) {
  return !entry.deprecated && (!entry.installedVersion || compareVersions(entry.version, entry.installedVersion) > 0) && Boolean(entry.repository) && ['available', 'healthy', 'ok'].includes(entry.health.toLowerCase())
}

export function useAdapterMarketPage() {
  const entries = ref<AdapterMarketEntry[]>([])
  const keyword = ref('')
  const activePlatform = ref('全部')
  const activeSort = ref<'downloads' | 'publishedAt' | 'name'>('downloads')
  const generatedAt = ref('')
  const sourceRepository = ref('')
  const platforms = computed(() => ['全部', ...new Set(entries.value.map(entry => entry.platform))])
  const sortOptions = [
    { label: '下载数量', value: 'downloads' },
    { label: '发布时间', value: 'publishedAt' },
    { label: 'A-z', value: 'name' }
  ]
  const loading = ref(false)
  const error = ref('')
  const message = ref('')
  const messageType = ref<'success' | 'error' | 'warning'>('success')
  const busyId = ref('')
  const preview = ref<AdapterInstallPreview | null>(null)
  const replace = ref(false)
  const installVisible = ref(false)
  const installBusy = ref(false)
  const installError = ref('')

  // ---------- catalog sources (official + third-party), kept separate from plugin sources ----------
  const sources = ref<CatalogSource[]>(listCatalogSources(SCOPE))
  const activeSource = ref<CatalogSource>(getActiveCatalogSource(SCOPE))

  const filtered = computed(() => {
    const query = keyword.value.trim().toLowerCase()
    return entries.value.filter(entry => (activePlatform.value === '全部' || entry.platform === activePlatform.value) && (!query || [entry.id, entry.name, entry.description, entry.repository, entry.platform, ...entry.authors].some(value => value.toLowerCase().includes(query))))
      .sort((left, right) => {
        if (activeSort.value === 'downloads') return (right.downloadCount ?? 0) - (left.downloadCount ?? 0)
        if (activeSort.value === 'publishedAt') return (right.publishedAt ?? '').localeCompare(left.publishedAt ?? '')
        return left.name.localeCompare(right.name)
      })
  })

  async function load(forceRefresh = false) {
    loading.value = true
    error.value = ''
    try {
      const catalog = await getAdapterMarketCatalog(forceRefresh, activeSource.value.url)
      entries.value = catalog.adapters
      generatedAt.value = formatAdapterDate(catalog.generatedAt)
      sourceRepository.value = catalog.sourceRepository || activeSource.value.url
      if (!platforms.value.includes(activePlatform.value)) activePlatform.value = '全部'
    } catch (cause) {
      error.value = getApiErrorMessage(cause, '适配器目录加载失败。')
    } finally {
      loading.value = false
    }
  }

  function selectSource(id: string) {
    const next = sources.value.find(source => source.id === id)
    if (!next || next.id === activeSource.value.id) return
    activeSource.value = next
    setActiveCatalogSource(next.id, SCOPE)
    entries.value = []
    void load(true)
  }

  function addSource(name: string, url: string) {
    const source = addCatalogSource(name, url, SCOPE)
    sources.value = listCatalogSources(SCOPE)
    selectSource(source.id)
  }

  function removeSource(id: string) {
    removeCatalogSource(id, SCOPE)
    sources.value = listCatalogSources(SCOPE)
    if (activeSource.value.id === id) {
      activeSource.value = sources.value[0]
      setActiveCatalogSource(activeSource.value.id, SCOPE)
      void load(true)
    }
  }

  // ---------- single repositories added directly (GitHub, Gitea, self-hosted) ----------
  const directEntries = ref<DirectAdapterEntry[]>(listDirectRepos(SCOPE).map(repo => ({
    repo,
    entry: placeholderFor(repo, 'resolving', '正在识别仓库…'),
    loading: true
  })))

  async function resolveDirect(item: DirectAdapterEntry) {
    item.loading = true
    try {
      item.entry = await resolveRepositoryAdapter(item.repo.url)
    } catch (cause) {
      item.entry = placeholderFor(item.repo, 'error', getApiErrorMessage(cause, '无法访问该仓库'))
    } finally {
      item.loading = false
    }
  }

  function resolveAllDirect() {
    for (const item of directEntries.value) void resolveDirect(item)
  }

  function addDirect(parsed: ParsedRepository) {
    const repo = addDirectRepo(parsed, SCOPE)
    const item = reactive<DirectAdapterEntry>({ repo, entry: placeholderFor(repo, 'resolving', '正在识别仓库…'), loading: true })
    directEntries.value = [...directEntries.value.filter(existing => existing.repo.url !== repo.url), item]
    void resolveDirect(item)
    return item
  }

  function removeDirect(id: string) {
    removeDirectRepo(id, SCOPE)
    directEntries.value = directEntries.value.filter(item => item.repo.id !== id)
  }

  function refresh() {
    void load(true)
    resolveAllDirect()
  }

  // ---------- install ----------
  async function prepare(entry: AdapterMarketEntry) {
    if (!entry.repository || busyId.value) return
    busyId.value = entry.id
    installError.value = ''
    try {
      preview.value = await prepareGithubAdapterInstall(entry.repository, entry.asset)
      replace.value = preview.value.conflict
      installVisible.value = true
    } catch (cause) {
      message.value = getApiErrorMessage(cause, '从仓库准备安装失败。')
      messageType.value = 'error'
    } finally {
      busyId.value = ''
    }
  }

  async function confirm() {
    if (!preview.value) return
    installBusy.value = true
    installError.value = ''
    try {
      const response = await confirmAdapterUpload(preview.value.uploadId, replace.value)
      installVisible.value = false
      message.value = response.message || (response.restartRequired ? '适配器已安装，需要重启宿主后完全生效。' : '适配器已安装并重载。')
      messageType.value = response.restartRequired || response.rollback ? 'warning' : 'success'
      await load()
      if (response.restartRequired) void offerRestartForStagedUpdate(message.value)
    } catch (cause) {
      installError.value = getApiErrorMessage(cause, '确认安装失败。')
    } finally {
      installBusy.value = false
    }
  }

  async function close(visible: boolean) {
    installVisible.value = visible
    if (visible) return
    const id = preview.value?.uploadId
    preview.value = null
    installError.value = ''
    replace.value = false
    if (id) try { await cancelAdapterUpload(id) } catch { /* Cleanup is best effort. */ }
  }

  onMounted(() => {
    void load()
    resolveAllDirect()
  })

  return {
    activePlatform, activeSort, platforms, sortOptions, generatedAt, sourceRepository,
    entries, keyword, filtered, loading, error, message, messageType, busyId,
    preview, replace, installVisible, installBusy, installError,
    sources, activeSource, selectSource, addSource, removeSource,
    directEntries, addDirect, removeDirect, refresh,
    load, prepare, confirm, close
  }
}
