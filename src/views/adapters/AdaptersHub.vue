<template>
  <div class="hub">
    <div v-if="installed.draggingAdapterFile.value" class="plugin-file-drop-hint" role="status">
      <MdIcon name="upload" />
      <strong>松开即可上传适配器</strong>
      <span>支持 .dll / .zip，解析后确认安装</span>
    </div>
    <!-- Same shape as the 插件 page: tabs, one search box, upload -->
    <header class="hub-header panel">
      <div class="button-group" role="tablist" aria-label="适配器视图">
        <button
          v-for="item in tabs"
          :key="item.key"
          type="button"
          role="tab"
          class="md-button toggle"
          :class="{ selected: tab === item.key }"
          :aria-selected="tab === item.key"
          @click="setTab(item.key)"
        >
          {{ item.label }}<span class="tab-count">{{ item.count }}</span>
        </button>
      </div>

      <label class="hub-search" aria-label="搜索适配器">
        <MdIcon name="search" />
        <input v-model="keyword" type="search" :placeholder="tab === 'installed' ? '搜索已安装的适配器' : '搜索适配器、平台或作者'" />
      </label>

      <button type="button" class="md-button tonal" @click="installed.installVisible.value = true">
        <MdIcon name="upload" />从文件安装
      </button>
    </header>

    <section class="hub-body" :class="{ 'with-rail': tab === 'discover' }">
      <!-- 发现 only: where adapters come from (catalogs, direct repos) -->
      <div v-if="tab === 'discover'" class="rail-pane panel">
        <SourceRail
          noun="适配器"
          :sources="market.sources.value"
          :active-source-id="market.activeSource.value.id"
          :view="discoverView"
          :direct-count="market.directEntries.value.length"
          @select-catalog="selectCatalog"
          @select-direct="discoverView = 'direct'"
          @remove-catalog="market.removeSource"
          @add="openAddSource"
        />
      </div>

      <div class="list-pane panel">
        <!-- 已安装 -->
        <template v-if="tab === 'installed'">
          <p v-if="installed.error.value" class="list-note">{{ installed.error.value }}</p>

          <template v-if="attention.length">
            <h3 class="list-label">需要处理<span>{{ attention.length }}</span></h3>
            <ul class="rows">
              <li v-for="item in attention" :key="`attention-${item.adapter.id}-${item.kind}`">
                <button type="button" class="row" @click="installed.selectedId.value = item.adapter.id">
                  <MdIcon :name="item.kind === 'error' ? 'error' : item.kind === 'update' ? 'arrow_upward' : 'restart_alt'" :class="['row-icon', item.kind]" />
                  <span class="row-text">
                    <strong>{{ item.adapter.name }}</strong>
                    <small>{{ item.reason }}</small>
                  </span>
                </button>
              </li>
            </ul>
          </template>

          <h3 class="list-label">全部<span>{{ installedList.length }}</span></h3>
          <ul v-if="installedList.length" class="rows">
            <li v-for="adapter in installedList" :key="adapter.id">
              <button
                type="button"
                class="row"
                :class="{ selected: installed.selectedId.value === adapter.id }"
                @click="installed.selectedId.value = adapter.id"
              >
                <span class="row-text">
                  <strong>{{ adapter.name }}</strong>
                  <small>{{ adapter.platform }} · v{{ adapter.version }}</small>
                </span>
                <span class="row-status">
                  <span class="status-dot" :class="adapterTone(adapter)" aria-hidden="true"></span>
                  {{ adapterLabel(adapter) }}
                </span>
              </button>
            </li>
          </ul>
          <div v-else-if="!installed.loading.value" class="list-empty">
            <MdIcon name="extension" />
            <strong>{{ keyword ? '没有匹配的适配器' : '还没有安装适配器' }}</strong>
            <button v-if="!keyword" type="button" class="md-button text" @click="setTab('discover')">去发现适配器</button>
          </div>
        </template>

        <!-- 发现 · single repositories added directly -->
        <template v-else-if="discoverView === 'direct'">
          <header class="list-head">
            <div class="list-head-text">
              <strong>单个适配器仓库</strong>
              <small>不经过目录，按 Shirobot Release 规则直接识别</small>
            </div>
            <button
              type="button"
              class="md-button tonal icon-only compact"
              aria-label="重新识别全部仓库"
              title="重新识别全部仓库"
              @click="market.refresh"
            >
              <MdIcon name="refresh" />
            </button>
          </header>

          <ul v-if="directList.length" class="rows">
            <li v-for="item in directList" :key="item.repo.id">
              <button
                type="button"
                class="row"
                :class="{ selected: selectedDirectId === item.repo.id }"
                @click="selectedDirectId = item.repo.id"
              >
                <span class="avatar host" aria-hidden="true">
                  <GitHubIcon v-if="item.repo.host === 'github'" />
                  <SiteIcon v-else :domain="item.repo.domain" />
                </span>
                <span class="row-text">
                  <strong>{{ item.entry.name }}</strong>
                  <small>{{ item.repo.owner }}/{{ item.repo.repo }} · {{ repoHostLabel(item.repo) }}</small>
                </span>
                <span class="row-status">
                  <span class="status-dot" :class="directTone(item)" aria-hidden="true"></span>
                  {{ directStatus(item) }}
                </span>
              </button>
              <button
                type="button"
                class="row-remove"
                :aria-label="`移除 ${item.repo.repo}`"
                title="移除"
                @click="market.removeDirect(item.repo.id)"
              >
                <MdIcon name="close" />
              </button>
            </li>
          </ul>
          <div v-else class="list-empty">
            <MdIcon name="code" />
            <strong>{{ keyword ? '没有匹配的仓库' : '还没有直接添加的仓库' }}</strong>
            <button v-if="!keyword" type="button" class="md-button text" @click="openAddSource('repo')">添加仓库</button>
          </div>
        </template>

        <!-- 发现 · catalog -->
        <template v-else>
          <header class="list-head">
            <div class="list-head-text">
              <strong>{{ market.activeSource.value.name }}</strong>
              <a
                v-if="sourceRepo"
                class="source-link"
                :href="`https://github.com/${sourceRepo}`"
                target="_blank"
                rel="noopener noreferrer"
              ><GitHubIcon /><span>{{ sourceRepo }}</span></a>
              <small v-else>{{ market.activeSource.value.url || '后端默认目录' }}</small>
            </div>
            <button
              type="button"
              class="md-button tonal icon-only compact"
              :disabled="market.loading.value"
              aria-label="刷新目录"
              title="从当前目录重新拉取"
              @click="market.refresh"
            >
              <MdIcon name="refresh" :class="{ spinning: market.loading.value }" />
            </button>
          </header>

          <p v-if="market.error.value" class="list-note">{{ market.error.value }}</p>

          <ul v-if="discoverList.length" class="rows">
            <li v-for="entry in discoverList" :key="entry.id">
              <button
                type="button"
                class="row"
                :class="{ selected: selectedEntryId === entry.id }"
                @click="selectedEntryId = entry.id"
              >
                <span class="row-text">
                  <strong>{{ entry.name }}</strong>
                  <small>{{ entry.description || entry.platform }}</small>
                </span>
                <span v-if="entry.downloadCount !== null" class="row-meta"><MdIcon name="download" />{{ entry.downloadCount }}</span>
              </button>
            </li>
          </ul>
          <div v-else-if="!market.loading.value" class="list-empty">
            <MdIcon name="search" />
            <strong>{{ discoverEmptyText }}</strong>
          </div>

          <p v-if="installedInCatalog" class="list-note">
            另有 {{ installedInCatalog }} 个已安装的适配器，
            <button type="button" class="inline-link" @click="setTab('installed')">在「已安装」中查看</button>
          </p>
        </template>
      </div>

      <div class="detail-pane panel">
        <AdapterDetail
          v-if="tab === 'installed'"
          :adapter="installed.selected.value"
          :update="installed.selected.value ? updateFor(installed.selected.value) : null"
          :busy="Boolean(installed.operation.value) || Boolean(market.busyId.value)"
          :operation="currentOperation"
          @run="action => installed.run(installed.selectedId.value, action)"
          @update="installUpdate"
          @config="configOpen = true"
        />
        <AdapterMarketDetail
          v-else
          :entry="selectedEntry"
          :preparing="Boolean(market.busyId.value)"
          :origin="discoverView === 'direct' ? '直接添加的仓库' : market.activeSource.value.name"
          @install="selectedEntry && market.prepare(selectedEntry)"
        />
        <div v-if="!detailHasContent" class="list-empty">
          <MdIcon name="extension" />
          <strong>{{ tab === 'discover' && !activeDiscoverCount ? '这里暂时没有可安装的适配器' : '选择一个适配器查看详情' }}</strong>
        </div>
      </div>
    </section>

    <AdapterInstallDialog
      :visible="installed.installVisible.value"
      title="从文件安装适配器"
      :file="installed.installFile.value"
      :preview="installed.installPreview.value"
      :replace="installed.installReplace.value"
      :busy="installed.installBusy.value"
      :error="installed.installError.value"
      @update:visible="installed.closeInstall"
      @update:file="installed.installFile.value = $event"
      @update:replace="installed.installReplace.value = $event"
      @submit="installed.submitInstall"
      @confirm="installed.confirmInstall"
    />
    <AdapterInstallDialog
      :visible="market.installVisible.value"
      title="从目录安装适配器"
      :file="null"
      :preview="market.preview.value"
      :replace="market.replace.value"
      :busy="market.installBusy.value"
      :error="market.installError.value"
      @update:visible="market.close"
      @update:replace="market.replace.value = $event"
      @confirm="confirmMarketInstall"
    />

    <!-- Config workspace: same editor as plugins, without routes -->
    <PluginConfigDialog
      v-model:visible="configOpen"
      target="adapter"
      :plugin-id="installed.selected.value?.id ?? ''"
      :plugin-name="installed.selected.value?.name ?? ''"
    />

    <AddSourceDialog
      v-model:visible="addSourceOpen"
      noun="适配器"
      :initial-type="addSourceType"
      @add-repo="addRepo"
      @add-catalog="addCatalog"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import GitHubIcon from '../../components/GitHubIcon.vue'
import MdIcon from '../../components/MdIcon.vue'
import SiteIcon from '../../components/SiteIcon.vue'
import type { AdapterMarketEntry, AdapterStatus } from '../../api'
import { githubRepoOf, repoHostLabel, type ParsedRepository, type SourceType } from '../../features/plugins/catalogSources'
import { isInstallableEntry, useAdapterMarketPage, type DirectAdapterEntry } from '../adapterMarket/AdapterMarket'
import PluginConfigDialog from '../pluginConfig/components/PluginConfigDialog.vue'
import AddSourceDialog from '../plugins/components/AddSourceDialog.vue'
import SourceRail from '../plugins/components/SourceRail.vue'
import { useAdaptersPage } from './Adapters'
import AdapterDetail from './components/AdapterDetail.vue'
import AdapterInstallDialog from './components/AdapterInstallDialog.vue'
import AdapterMarketDetail from './components/AdapterMarketDetail.vue'

type HubTab = 'installed' | 'discover'

const route = useRoute()
const router = useRouter()

// Both halves reuse the existing page composables; this page only arranges them.
const installed = useAdaptersPage()
const market = useAdapterMarketPage()

const tab = computed<HubTab>(() => route.query.tab === 'discover' ? 'discover' : 'installed')

function setTab(next: HubTab) {
  const query = { ...route.query }
  if (next === 'installed') delete query.tab
  else query.tab = next
  void router.replace({ query })
}

// One search box: the installed list filters locally, the catalog uses the market's keyword.
const installedKeyword = ref('')
const keyword = computed({
  get: () => tab.value === 'installed' ? installedKeyword.value : market.keyword.value,
  set: value => {
    if (tab.value === 'installed') installedKeyword.value = value
    else market.keyword.value = value
  }
})

const installedList = computed(() => {
  const query = installedKeyword.value.trim().toLowerCase()
  return installed.adapters.value.filter(adapter => !query
    || [adapter.name, adapter.id, adapter.platform, adapter.description].some(value => value.toLowerCase().includes(query)))
})

function compareVersions(left: string, right: string) {
  return left.replace(/^v/i, '').localeCompare(right.replace(/^v/i, ''), 'en', { numeric: true })
}

/** Catalog entry offering a newer version of an installed adapter */
function updateFor(adapter: AdapterStatus): AdapterMarketEntry | null {
  const entry = market.entries.value.find(item => item.id === adapter.id)
  return entry && compareVersions(entry.version, adapter.version) > 0 ? entry : null
}

function adapterTone(adapter: AdapterStatus) {
  if (adapter.error) return 'error'
  if (adapter.restartRequired) return 'warning'
  return adapter.loaded ? 'success' : 'neutral'
}

function adapterLabel(adapter: AdapterStatus) {
  if (adapter.error) return '异常'
  if (adapter.restartRequired) return '待重启'
  return adapter.loaded ? '运行中' : '已停止'
}

const attention = computed(() => installed.adapters.value.flatMap(adapter => {
  const items: Array<{ adapter: AdapterStatus; kind: 'error' | 'update' | 'restart'; reason: string }> = []
  if (adapter.error) items.push({ adapter, kind: 'error', reason: adapter.error })
  const update = updateFor(adapter)
  if (update) items.push({ adapter, kind: 'update', reason: `可更新到 v${update.version}` })
  if (adapter.restartRequired) items.push({ adapter, kind: 'restart', reason: '需要重启宿主后生效' })
  return items
}))

const currentOperation = computed(() => {
  const [id, action] = installed.operation.value.split(':')
  return id === installed.selectedId.value ? action ?? '' : ''
})

function installUpdate() {
  const adapter = installed.selected.value
  const entry = adapter ? updateFor(adapter) : null
  if (entry) void market.prepare(entry)
}

// 发现 lists only what isn't installed; updates live in 已安装.
const installedIds = computed(() => new Set(installed.adapters.value.map(adapter => adapter.id)))
const discoverList = computed(() => market.filtered.value.filter(entry => !installedIds.value.has(entry.id) && !entry.installedVersion))
const installedInCatalog = computed(() => market.entries.value.filter(entry => installedIds.value.has(entry.id) || entry.installedVersion).length)

const discoverEmptyText = computed(() => {
  if (!market.entries.value.length) return '目录暂无适配器'
  if (market.keyword.value.trim()) return '没有匹配的适配器'
  return '目录里的适配器都已安装'
})

const configOpen = ref(false)

// ---------- 发现: source rail ----------

/** What the middle list shows: the active catalog, or the directly added repositories. */
const discoverView = ref<'catalog' | 'direct'>('catalog')
const addSourceOpen = ref(false)
const addSourceType = ref<SourceType>('repo')

function selectCatalog(id: string) {
  discoverView.value = 'catalog'
  market.selectSource(id)
}

function openAddSource(type: SourceType) {
  addSourceType.value = type
  addSourceOpen.value = true
}

function addRepo(repo: ParsedRepository) {
  discoverView.value = 'direct'
  const item = market.addDirect(repo)
  selectedDirectId.value = item.repo.id
}

function addCatalog(name: string, url: string) {
  discoverView.value = 'catalog'
  market.addSource(name, url)
}

const sourceRepo = computed(() => githubRepoOf(market.activeSource.value.url))

const directList = computed(() => {
  const query = market.keyword.value.trim().toLowerCase()
  return market.directEntries.value.filter(item => !query
    || [item.entry.name, item.repo.owner, item.repo.repo, item.repo.domain].some(value => value.toLowerCase().includes(query)))
})

function directTone(item: DirectAdapterEntry) {
  if (item.loading) return 'neutral'
  if (installedIds.value.has(item.entry.id)) return 'primary'
  return isInstallableEntry(item.entry) ? 'success' : item.entry.health === 'error' ? 'error' : 'warning'
}

function directStatus(item: DirectAdapterEntry) {
  if (item.loading) return '识别中'
  if (installedIds.value.has(item.entry.id)) return '已安装'
  if (isInstallableEntry(item.entry)) return '可安装'
  return item.entry.health === 'error' ? '无法访问' : '无合规发布'
}

// Selection: one id per view, kept valid as lists change.
const selectedEntryId = ref('')
const selectedDirectId = ref('')
watch(discoverList, list => {
  if (!list.some(entry => entry.id === selectedEntryId.value)) selectedEntryId.value = list[0]?.id ?? ''
}, { immediate: true })
watch(directList, list => {
  if (!list.some(item => item.repo.id === selectedDirectId.value)) selectedDirectId.value = list[0]?.repo.id ?? ''
}, { immediate: true })

const selectedEntry = computed<AdapterMarketEntry | null>(() => discoverView.value === 'direct'
  ? directList.value.find(item => item.repo.id === selectedDirectId.value)?.entry ?? null
  : discoverList.value.find(entry => entry.id === selectedEntryId.value) ?? null)

const activeDiscoverCount = computed(() => discoverView.value === 'direct' ? directList.value.length : discoverList.value.length)

const tabs = computed(() => [
  { key: 'installed' as const, label: '已安装', count: installed.adapters.value.length },
  { key: 'discover' as const, label: '发现', count: market.entries.value.length - installedInCatalog.value }
])

const detailHasContent = computed(() => tab.value === 'installed' ? Boolean(installed.selected.value) : Boolean(selectedEntry.value))

async function confirmMarketInstall() {
  await market.confirm()
  await installed.loadAdapters()
}

// Results of actions show as snackbars, then clear so the same text can appear again later.
function toast(text: string, type: 'success' | 'error' | 'warning', clear: () => void) {
  if (!text) return
  ElMessage({ message: text, type, duration: type === 'error' ? 6000 : 3000, showClose: type === 'error', grouping: true })
  clear()
}

watch(() => installed.message.value, text => toast(text, installed.messageType.value, () => { installed.message.value = '' }))
watch(() => market.message.value, text => toast(text, market.messageType.value, () => { market.message.value = '' }))
</script>

<style scoped src="../plugins/PluginsHub.css"></style>
<style scoped>
.row-icon.restart { color: var(--md-sys-color-warning); }
</style>
