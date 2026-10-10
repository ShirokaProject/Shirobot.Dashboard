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
                <button type="button" class="row" @click="selectAttention(item)">
                  <MdIcon :name="item.kind === 'error' ? 'error' : item.kind === 'update' ? 'arrow_upward' : 'restart_alt'" :class="['row-icon', item.kind]" />
                  <span class="row-text">
                    <strong>{{ item.kind === 'update' ? `程序集 · ${item.adapter.packageId || item.adapter.id}` : item.adapter.name }}</strong>
                    <small>{{ item.reason }}</small>
                  </span>
                </button>
              </li>
            </ul>
          </template>

          <h3 class="list-label">适配器<span>{{ packageGroups.length }}</span></h3>
          <ul v-if="packageGroups.length" class="rows">
            <li v-for="group in packageGroups" :key="group.package.id" class="package-item">
              <button
                type="button"
                class="row"
                :class="{ selected: !installed.selectedId.value && selectedPackage?.id === group.package.id }"
                :aria-expanded="isExpanded(group.package.id)"
                @click="togglePackage(group.package.id)"
              >
                <MdIcon name="expand_more" class="row-icon chevron" :class="{ open: isExpanded(group.package.id) }" />
                <span class="row-text">
                  <strong>{{ group.package.name }}</strong>
                  <small>{{ group.package.platform }} · v{{ group.package.version }}</small>
                </span>
                <span class="row-meta">{{ packageEnabled(group.package) ? '' : '已关闭 · ' }}{{ group.instances.length }} 个实例</span>
              </button>
              <ul v-if="isExpanded(group.package.id)" class="rows instance-rows">
                <li v-for="adapter in group.instances" :key="adapter.id">
                  <button
                    type="button"
                    class="row"
                    :class="{ selected: installed.selectedId.value === adapter.id }"
                    @click="installed.selectedId.value = adapter.id"
                  >
                    <span class="row-text">
                      <strong>{{ adapter.name }}</strong>
                      <small>{{ adapter.id }}</small>
                    </span>
                    <span class="row-status">
                      <span class="status-dot" :class="adapterTone(adapter)" aria-hidden="true"></span>
                      {{ adapterLabel(adapter) }}
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    class="row add-instance"
                    :disabled="Boolean(installed.operation.value)"
                    @click="installed.openInstance(group.package.id)"
                  >
                    <MdIcon name="add" />添加实例
                  </button>
                </li>
              </ul>
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
              <small v-else>{{ market.sourceRepository.value || market.activeSource.value.url || '后端默认目录' }}</small>
            </div>
            <span v-if="market.entries.value.length && market.generatedAt.value" class="list-head-time">更新于 {{ market.generatedAt.value }}</span>
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

          <div class="list-filters">
            <div class="button-group" role="radiogroup" aria-label="适配器平台">
              <button v-for="platform in market.platforms.value" :key="platform" type="button" role="radio"
                class="md-button compact toggle" :class="{ selected: market.activePlatform.value === platform }"
                :aria-checked="market.activePlatform.value === platform" @click="market.activePlatform.value = platform">
                {{ platform }}
              </button>
            </div>
            <div class="sort-select">
              <span>排序</span>
              <el-select v-model="market.activeSort.value" class="sort-control" aria-label="排序方式">
                <el-option v-for="option in market.sortOptions" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
            </div>
          </div>

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
                <span v-if="entry.installedVersion" class="row-status">已安装</span>
                <span v-else-if="entry.downloadCount !== null" class="row-meta"><MdIcon name="download" />{{ entry.downloadCount }}</span>
              </button>
            </li>
          </ul>
          <div v-else-if="!market.loading.value" class="list-empty">
            <MdIcon name="search" />
            <strong>{{ discoverEmptyText }}</strong>
          </div>

        </template>
      </div>

      <div class="detail-pane panel">
        <AdapterDetail
          v-if="tab === 'installed' && installed.selected.value"
          :adapter="installed.selected.value"
          :market-entry="selectedPackage ? marketEntryFor(selectedPackage) : marketEntryFor(installed.selected.value)"
          :package-name="selectedPackage?.name ?? installed.selected.value.packageId ?? ''"
          :package-enabled="selectedPackage ? packageEnabled(selectedPackage) : true"
          :busy="Boolean(installed.operation.value) || Boolean(market.busyId.value)"
          :operation="currentOperation"
          @run="action => installed.run(installed.selectedId.value, action)"
          @config="configOpen = true"
        />
        <AdapterPackageDetail
          v-else-if="tab === 'installed' && selectedPackage"
          :pkg="selectedPackage"
          :market-entry="marketEntryFor(selectedPackage)"
          :instance-count="instancesOf(selectedPackage.id).length"
          :update="updateFor(selectedPackage)"
          :busy="Boolean(installed.operation.value) || Boolean(market.busyId.value)"
          :enabled="packageEnabled(selectedPackage)"
          :controls="installed.packageControls.value"
          :operation="packageOperation"
          @update="prepareUpdate(selectedPackage)"
          @run="action => installed.runPackage(selectedPackage!.id, action)"
          @remove="installed.removePackage(selectedPackage.id)"
        />
        <AdapterMarketDetail
          v-else-if="tab === 'discover'"
          :entry="selectedEntry ? withInstalledVersion(selectedEntry) : null"
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

    <el-dialog v-model="installed.instanceVisible.value" title="添加适配器实例" width="min(480px, 92vw)" :close-on-click-modal="false">
      <p>复用已安装的适配器文件，每个实例独立配置、启动和停止。新实例先保持停用。</p>
      <el-form label-position="top" @submit.prevent="installed.createInstance">
        <el-form-item label="实例 ID"><el-input v-model="installed.instanceId.value" placeholder="例如：qq-work" maxlength="64" /></el-form-item>
        <el-form-item label="显示名称"><el-input v-model="installed.instanceName.value" placeholder="例如：工作群机器人（可选）" maxlength="100" /></el-form-item>
      </el-form>
      <el-alert v-if="installed.instanceError.value" :title="installed.instanceError.value" type="error" :closable="false" show-icon />
      <template #footer>
        <el-button :disabled="Boolean(installed.operation.value)" @click="installed.instanceVisible.value = false">取消</el-button>
        <el-button type="primary" :loading="Boolean(installed.operation.value)" :disabled="!installed.instanceId.value.trim()" @click="installed.createInstance">创建实例</el-button>
      </template>
    </el-dialog>

    <!-- Config workspace: same editor as plugins, without routes -->
    <PluginConfigDialog
      v-model:visible="configOpen"
      target="adapter"
      :plugin-id="installed.selected.value?.id ?? ''"
      :plugin-name="installed.selected.value?.name ?? ''"
      @instance-saved="followRenamedInstance"
    />

    <AddSourceDialog
      v-if="CUSTOM_MARKET_SOURCES_ENABLED"
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
import { findAdapterMarketEntry } from '../../features/adapters/market'
import type { AdapterMarketEntry, AdapterStatus } from '../../api'
import { CUSTOM_MARKET_SOURCES_ENABLED, githubRepoOf, repoHostLabel, type ParsedRepository, type SourceType } from '../../features/plugins/catalogSources'
import { isInstallableEntry, useAdapterMarketPage, type DirectAdapterEntry } from '../adapterMarket/AdapterMarket'
import PluginConfigDialog from '../pluginConfig/components/PluginConfigDialog.vue'
import AddSourceDialog from '../plugins/components/AddSourceDialog.vue'
import SourceRail from '../plugins/components/SourceRail.vue'
import { useAdaptersPage } from './Adapters'
import AdapterDetail from './components/AdapterDetail.vue'
import AdapterInstallDialog from './components/AdapterInstallDialog.vue'
import AdapterMarketDetail from './components/AdapterMarketDetail.vue'
import AdapterPackageDetail from './components/AdapterPackageDetail.vue'

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

const selectedPackageId = ref('')
const expandedPackages = ref<string[]>([])
const packageOf = (adapter: AdapterStatus) => adapter.packageId || adapter.id
const instancesOf = (packageId: string) => installed.adapters.value.filter(item => packageOf(item) === packageId)
const isExpanded = (id: string) => Boolean(keyword.value) || expandedPackages.value.includes(id)
function selectPackage(id: string) {
  selectedPackageId.value = id
  installed.selectedId.value = ''
}
// First click on a package selects it; clicking the already-selected package folds/unfolds it.
function togglePackage(id: string) {
  const alreadySelected = !installed.selectedId.value && selectedPackage.value?.id === id
  if (!expandedPackages.value.includes(id)) expandedPackages.value.push(id)
  else if (alreadySelected) expandedPackages.value = expandedPackages.value.filter(item => item !== id)
  selectPackage(id)
}
watch(installed.selectedId, id => {
  const adapter = installed.adapters.value.find(item => item.id === id)
  if (!adapter) return
  selectedPackageId.value = packageOf(adapter)
  if (!expandedPackages.value.includes(selectedPackageId.value)) expandedPackages.value.push(selectedPackageId.value)
})
const selectedPackage = computed(() => installed.packages.value.find(item => item.id === selectedPackageId.value) ?? installed.packages.value[0] ?? null)
function selectAttention(item: { adapter: AdapterStatus; kind: string }) {
  if (item.kind === 'update' || !installed.adapters.value.some(adapter => adapter.id === item.adapter.id)) {
    const id = packageOf(item.adapter)
    if (!expandedPackages.value.includes(id)) expandedPackages.value.push(id)
    selectPackage(id)
  } else installed.selectedId.value = item.adapter.id
}
// Older hosts report no package switch; treat the package as on there.
const packageEnabled = (pkg: AdapterStatus) => !installed.packageControls.value || pkg.enabled !== false
const packageOperation = computed(() => {
  const [id, action] = installed.operation.value.split(':')
  return selectedPackage.value && id === selectedPackage.value.id ? action ?? '' : ''
})
// Reload first, then select: selecting a new ID before the list has it would empty the panel and dialog for a moment.
async function followRenamedInstance(id: string) {
  await installed.loadAdapters()
  installed.selectedId.value = id
}
function prepareUpdate(adapter: AdapterStatus) {
  const entry = updateFor(adapter)
  if (entry) void market.prepare(entry)
}
const packageGroups = computed(() => {
  const query = installedKeyword.value.trim().toLowerCase()
  return installed.packages.value.map(pkg => ({ package: pkg, instances: instancesOf(pkg.id) }))
    .filter(group => !query || [group.package.name, group.package.id, group.package.platform, ...group.instances.flatMap(item => [item.name, item.id])].some(value => value.toLowerCase().includes(query)))
})

const marketEntries = computed(() => [...market.entries.value, ...market.directEntries.value.map(item => item.entry)])
const marketEntryFor = (adapter: AdapterStatus) => findAdapterMarketEntry(adapter, marketEntries.value)

/** Catalog entry offering a newer version of an installed adapter */
function updateFor(adapter: AdapterStatus): AdapterMarketEntry | null {
  const entry = marketEntryFor(adapter)
  return entry && isInstallableEntry({ ...entry, installedVersion: adapter.version }) ? entry : null
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

const attention = computed(() => {
  const items: Array<{ adapter: AdapterStatus; kind: 'error' | 'update' | 'restart'; reason: string }> = []
  const packages = new Set<string>()
  for (const adapter of [...installed.adapters.value, ...installed.packages.value.filter(pkg => !installed.adapters.value.some(item => (item.packageId || item.id) === pkg.id))]) {
    if (adapter.error) items.push({ adapter, kind: 'error', reason: adapter.error })
    const update = updateFor(adapter)
    const packageId = adapter.packageId || adapter.id
    if (update && !packages.has(packageId)) {
      packages.add(packageId)
      items.push({ adapter, kind: 'update', reason: `更新程序集至 v${update.version} · 所有同包实例生效` })
    }
    if (adapter.restartRequired) items.push({ adapter, kind: 'restart', reason: '需要重启宿主后生效' })
  }
  return items
})

const currentOperation = computed(() => {
  const [id, action] = installed.operation.value.split(':')
  return id === installed.selectedId.value ? action ?? '' : ''
})

// Keep installed entries visible, after the current market sort, as on the plugin page.
function withInstalledVersion(entry: AdapterMarketEntry): AdapterMarketEntry {
  const pkg = installed.packages.value.find(item => findAdapterMarketEntry(item, [entry]))
  return pkg ? { ...entry, installedVersion: pkg.version } : entry
}
const discoverList = computed(() => market.filtered.value.map(withInstalledVersion)
  .sort((a, b) => Number(Boolean(a.installedVersion)) - Number(Boolean(b.installedVersion))))
const discoverEmptyText = computed(() => market.entries.value.length ? '没有匹配的适配器' : '这个源暂无适配器')

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
  if (!CUSTOM_MARKET_SOURCES_ENABLED) return
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

const sourceRepo = computed(() => githubRepoOf(market.sourceRepository.value || market.activeSource.value.url))

const directList = computed(() => {
  const query = market.keyword.value.trim().toLowerCase()
  return market.directEntries.value.filter(item => !query
    || [item.entry.name, item.repo.owner, item.repo.repo, item.repo.domain].some(value => value.toLowerCase().includes(query)))
    .sort((a, b) => Number(Boolean(withInstalledVersion(a.entry).installedVersion)) - Number(Boolean(withInstalledVersion(b.entry).installedVersion)))
})

function directTone(item: DirectAdapterEntry) {
  if (item.loading) return 'neutral'
  if (withInstalledVersion(item.entry).installedVersion) return 'primary'
  return isInstallableEntry(item.entry) ? 'success' : item.entry.health === 'error' ? 'error' : 'warning'
}

function directStatus(item: DirectAdapterEntry) {
  if (item.loading) return '识别中'
  if (withInstalledVersion(item.entry).installedVersion) return '已安装'
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
  { key: 'installed' as const, label: '已安装', count: installed.packages.value.length },
  { key: 'discover' as const, label: '发现', count: market.entries.value.length }
])

const detailHasContent = computed(() => tab.value === 'installed' ? Boolean(installed.selected.value || selectedPackage.value) : Boolean(selectedEntry.value))

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

<style scoped>
/* `.rows li` centres its child; a package stacks its own row over its instances */
.rows li.package-item {
  flex-direction: column;
  align-items: stretch;
}
.chevron {
  font-size: 20px;
  color: var(--md-sys-color-on-surface-variant);
  transform: rotate(-90deg);
  transition: transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}
.chevron.open { transform: none; }
/* Instances sit under the package, text aligned with the package name */
.instance-rows {
  margin-top: var(--md-space-1);
  padding-left: calc(40px + var(--md-space-3));
}
.instance-rows .row { min-height: 60px; }
.row.add-instance {
  min-height: 44px;
  gap: var(--md-space-2);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-large);
}
.row.add-instance .md-icon { font-size: 18px; }
.row.add-instance:disabled { cursor: default; opacity: .5; }
</style>
