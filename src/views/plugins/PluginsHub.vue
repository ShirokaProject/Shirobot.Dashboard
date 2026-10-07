<template>
  <div class="hub">
    <div v-if="installed.draggingPluginFile.value" class="plugin-file-drop-hint" role="status">
      <MdIcon name="upload" />
      <strong>松开即可上传插件</strong>
      <span>支持 .dll / .zip，解析后确认安装</span>
    </div>
    <!-- Header: tab switch, one search box, context action -->
    <header class="hub-header panel">
      <div class="button-group" role="tablist" aria-label="插件视图">
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

      <label class="hub-search" aria-label="搜索插件">
        <MdIcon name="search" />
        <input v-model="keyword" type="search" :placeholder="tab === 'installed' ? '搜索已安装的插件' : '搜索插件、作者或仓库'" />
      </label>

      <button type="button" class="md-button tonal" @click="installed.uploadDialogVisible.value = true">
        <MdIcon name="upload" />上传
      </button>
    </header>

    <section class="hub-body" :class="{ 'with-rail': tab === 'discover' }">
      <!-- 发现 only: where plugins come from (catalogs, direct repos) -->
      <div v-if="tab === 'discover'" class="rail-pane panel">
        <SourceRail
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

      <!-- List pane: scan names first, details on the right -->
      <div class="list-pane panel">
        <template v-if="tab === 'installed'">
          <p v-if="installed.loadError.value" class="list-note">{{ installed.loadError.value }}</p>

          <template v-if="attention.length">
            <h3 class="list-label">需要处理<span>{{ attention.length }}</span></h3>
            <ul class="rows">
              <li v-for="item in attention" :key="`attention-${item.plugin.id}`">
                <!-- Shortcut rows: selecting one highlights the plugin in 全部 below, not here -->
                <button type="button" class="row" @click="installed.selectPlugin(item.plugin)">
                  <MdIcon :name="item.kind === 'error' ? 'error' : 'arrow_upward'" :class="['row-icon', item.kind]" />
                  <span class="row-text">
                    <strong>{{ item.plugin.name }}</strong>
                    <small>{{ item.reason }}</small>
                  </span>
                </button>
              </li>
            </ul>
          </template>

          <h3 class="list-label">全部<span>{{ installedList.length }}</span></h3>
          <ul v-if="installedList.length" class="rows">
            <li v-for="plugin in installedList" :key="plugin.id">
              <button
                type="button"
                class="row"
                :class="{ selected: installed.selectedPlugin.value?.id === plugin.id }"
                @click="installed.selectPlugin(plugin)"
              >
                <span class="row-text">
                  <strong>{{ plugin.name }}</strong>
                  <small>{{ plugin.description }}</small>
                </span>
              </button>
              <el-switch
                class="row-switch"
                :model-value="plugin.status === 'enabled'"
                :disabled="installed.isPluginToggleLocked(plugin)"
                :aria-label="`${plugin.status === 'enabled' ? '停用' : '启用'} ${plugin.name}`"
                @change="(value: string | number | boolean) => installed.togglePlugin(plugin, Boolean(value))"
              />
            </li>
          </ul>
          <div v-else class="list-empty">
            <MdIcon name="extension" />
            <strong>{{ keyword ? '没有匹配的插件' : '还没有安装插件' }}</strong>
            <button v-if="!keyword" type="button" class="md-button text" @click="setTab('discover')">去发现插件</button>
          </div>
        </template>

        <!-- 发现 · single repositories added directly -->
        <template v-else-if="discoverView === 'direct'">
          <header class="list-head">
            <div class="list-head-text">
              <strong>单个插件仓库</strong>
              <small>不经过目录，按 Shirobot Release 规则直接识别</small>
            </div>
            <button
              type="button"
              class="md-button tonal icon-only compact"
              aria-label="重新识别全部仓库"
              title="重新识别全部仓库"
              @click="market.refreshMarketplacePlugins"
            >
              <MdIcon name="refresh" />
            </button>
          </header>

          <ul v-if="directList.length" class="rows">
            <li v-for="entry in directList" :key="entry.repo.id">
              <button
                type="button"
                class="row"
                :class="{ selected: market.selectedPlugin.value?.repository === entry.plugin.repository }"
                @click="market.selectedPlugin.value = entry.plugin"
              >
                <span class="avatar host" aria-hidden="true">
                  <GitHubIcon v-if="entry.repo.host === 'github'" />
                  <SiteIcon v-else :domain="entry.repo.domain" />
                </span>
                <span class="row-text">
                  <strong>{{ entry.plugin.name }}</strong>
                  <small>{{ entry.repo.owner }}/{{ entry.repo.repo }} · {{ repoHostLabel(entry.repo) }}</small>
                </span>
                <span class="row-status" :class="directTone(entry)">
                  <span class="status-dot" :class="directTone(entry)" aria-hidden="true"></span>
                  {{ directStatus(entry) }}
                </span>
              </button>
              <button
                type="button"
                class="row-remove"
                :aria-label="`移除 ${entry.repo.repo}`"
                title="移除"
                @click="market.removeDirect(entry.repo.id)"
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
              <small v-else>{{ market.sourceRepository.value || '后端默认目录' }}</small>
            </div>
            <span v-if="market.marketplacePlugins.value.length" class="list-head-time">更新于 {{ market.generatedAt.value }}</span>
            <button
              type="button"
              class="md-button tonal icon-only compact"
              :disabled="market.loading.value"
              :aria-label="market.refreshing.value ? '正在刷新' : '刷新目录'"
              title="从当前目录重新拉取"
              @click="market.refreshMarketplacePlugins"
            >
              <MdIcon name="refresh" :class="{ spinning: market.refreshing.value }" />
            </button>
          </header>

          <div class="list-filters">
            <div class="button-group" role="radiogroup" aria-label="插件分类">
              <button
                v-for="category in market.categories.value"
                :key="category"
                type="button"
                role="radio"
                class="md-button compact toggle"
                :class="{ selected: market.activeCategory.value === category }"
                :aria-checked="market.activeCategory.value === category"
                @click="market.activeCategory.value = category"
              >
                {{ category === '全部' ? category : market.categoryLabel(category) }}
              </button>
            </div>
            <div class="sort-select">
              <span>排序</span>
              <el-select v-model="market.activeSort.value" class="sort-control" aria-label="排序方式">
                <el-option v-for="option in market.sortOptions" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
            </div>
          </div>

          <p v-if="market.loadError.value" class="list-note">{{ market.loadError.value }}</p>

          <ul v-if="discoverList.length" class="rows">
            <li v-for="plugin in discoverList" :key="plugin.id">
              <button
                type="button"
                class="row"
                :class="{ selected: market.selectedPlugin.value?.id === plugin.id }"
                @click="market.selectedPlugin.value = plugin"
              >
                <span class="row-text">
                  <strong>{{ plugin.name }}</strong>
                  <small>{{ plugin.description }}</small>
                </span>
                <span v-if="plugin.installed" class="row-status">已安装</span>
                <span v-else class="row-meta"><MdIcon name="download" />{{ market.formatDownloads(plugin.release.downloadCount) }}</span>
              </button>
            </li>
          </ul>
          <div v-else-if="!market.loading.value" class="list-empty">
            <MdIcon name="search" />
            <strong>{{ discoverEmptyText }}</strong>
          </div>

        </template>
      </div>

      <!-- Detail pane -->
      <div class="detail-pane panel">
        <InstalledDetail
          v-if="tab === 'installed'"
          :plugin="installed.selectedPlugin.value"
          :market-plugin="installedMarketPlugin"
          :published-at="installedMarketPlugin ? market.formatDate(installedMarketPlugin.release.publishedAt) : ''"
          :compatibility="installedMarketPlugin ? market.formatCompatibility(installedMarketPlugin) : '—'"
          :status-text="installed.statusText"
          :actions="installed.pluginActions.value"
          :actions-loading="installed.pluginActionsLoading.value"
          :actions-error="installed.pluginActionsError.value"
          :running-action-id="installed.runningPluginActionId.value"
          :host-operation="installed.hostOperation.value"
          @open-config="openConfig"
          @action="installed.executePluginAction"
          @update="installed.updatePlugin"
          @delete="installed.deletePlugin"
        />
        <MarketDetail
          v-else-if="market.selectedPlugin.value"
          :plugin="market.selectedPlugin.value"
          :authors="market.formatAuthors(market.selectedPlugin.value)"
          :category="market.categoryLabel(market.selectedPlugin.value.category)"
          :published-at="market.formatDate(market.selectedPlugin.value.release.publishedAt)"
          :compatibility="market.formatCompatibility(market.selectedPlugin.value)"
          :healthy="market.isHealthy(market.selectedPlugin.value)"
          :health-label="market.healthLabel(market.selectedPlugin.value.health.status)"
          :installable="market.canInstallPlugin(market.selectedPlugin.value)"
          :install-label="market.installButtonLabel(market.selectedPlugin.value)"
          :preparing="Boolean(market.preparingPluginId.value)"
          :origin="discoverView === 'direct' ? '直接添加的仓库' : market.activeSource.value.name"
          @install="market.preparePluginInstall"
        />
        <div v-if="!detailHasContent" class="list-empty">
          <MdIcon name="extension" />
          <strong>{{ tab === 'discover' && !activeDiscoverPlugins.length ? '这里暂时没有可安装的插件' : '选择一个插件查看详情' }}</strong>
        </div>
      </div>
    </section>

    <!-- Local upload (installed composable) -->
    <PluginUploadDialog
      v-model:visible="installed.uploadDialogVisible.value"
      v-model:selected-file="installed.selectedPluginFile.value"
      :upload-result="installed.pluginUploadResult.value"
      :upload-error="installed.pluginUploadError.value"
      :parsing="installed.pluginUploadParsing.value"
      :installing="installed.pluginUploadInstalling.value"
      v-model:replace="installed.pluginUploadReplace.value"
      v-model:enable="installed.pluginUploadEnable.value"
      @submit="installed.submitPluginUpload"
      @confirm="installed.confirmUploadedPlugin"
    />

    <!-- Install from catalog (market composable) -->
    <PluginUploadDialog
      :visible="market.installDialogVisible.value"
      :title="market.installDialogTitle.value"
      :show-hero="false"
      :upload-result="market.installPreview.value"
      :upload-error="market.installError.value"
      :parsing="false"
      :installing="market.installConfirming.value"
      :replace="market.installReplace.value"
      :enable="market.installEnable.value"
      @update:visible="market.setInstallDialogVisible"
      @update:replace="market.installReplace.value = $event"
      @update:enable="market.installEnable.value = $event"
      @confirm="market.confirmMarketInstall"
    />

    <!-- Config workspace: edit in place; "在完整页面打开" leads to the full page -->
    <PluginConfigDialog
      v-model:visible="configOpen"
      :plugin-id="configPlugin?.id ?? ''"
      :plugin-name="configPlugin?.name ?? ''"
    />

    <AddSourceDialog
      v-model:visible="addSourceOpen"
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
import {
  githubRepoOf,
  repoHostLabel,
  type ParsedRepository,
  type SourceType
} from '../../features/plugins/catalogSources'
import type { Plugin } from '../../features/plugins/types'
import PluginUploadDialog from '../plugin/components/PluginUploadDialog.vue'
import { usePluginsPage } from '../plugin/Plugins'
import { usePluginMarketPage, type DirectEntry } from '../pluginMarket/PluginMarket'
import PluginConfigDialog from '../pluginConfig/components/PluginConfigDialog.vue'
import AddSourceDialog from './components/AddSourceDialog.vue'
import InstalledDetail from './components/InstalledDetail.vue'
import MarketDetail from './components/MarketDetail.vue'
import SourceRail from './components/SourceRail.vue'

type HubTab = 'installed' | 'discover'

const route = useRoute()
const router = useRouter()

// Both halves reuse the existing page composables; this page only arranges them.
const installed = usePluginsPage()
const market = usePluginMarketPage({ onInstalled: () => void installed.reloadInstalled() })

const tab = computed<HubTab>(() => route.query.tab === 'discover' ? 'discover' : 'installed')

function setTab(next: HubTab) {
  const query = { ...route.query }
  if (next === 'installed') delete query.tab
  else query.tab = next
  void router.replace({ query })
}

// One search box, bound to whichever half is showing.
const keyword = computed({
  get: () => tab.value === 'installed' ? installed.keyword.value : market.keyword.value,
  set: value => {
    if (tab.value === 'installed') installed.keyword.value = value
    else market.keyword.value = value
  }
})

const installedList = computed(() => installed.filteredInstalled.value)

const installedMarketPlugin = computed(() => {
  const plugin = installed.selectedPlugin.value
  if (!plugin) return null
  const normalizeRepo = (repo: string) => (githubRepoOf(repo) ?? repo.trim()).replace(/\/+$/, '').replace(/\.git$/i, '').toLowerCase()
  const entries = [...market.marketplacePlugins.value, ...market.directEntries.value.map(entry => entry.plugin)]
  return entries.find(entry => plugin.repo && normalizeRepo(entry.repository) === normalizeRepo(plugin.repo))
    ?? entries.find(entry => entry.id.toLowerCase() === plugin.id.toLowerCase())
    ?? null
})

// Keep the selected market sort within each group, with installed plugins last.
const discoverList = computed(() => [...market.filteredPlugins.value]
  .sort((a, b) => Number(Boolean(a.installed)) - Number(Boolean(b.installed))))

const discoverEmptyText = computed(() => {
  const total = market.marketplacePlugins.value.length
  if (!total) return '这个源暂无插件'
  return '没有匹配的插件'
})

const tabs = computed(() => [
  { key: 'installed' as const, label: '已安装', count: installed.installedPlugins.value.length },
  { key: 'discover' as const, label: '发现', count: market.marketplacePlugins.value.length }
])

const attention = computed(() => installed.installedPlugins.value.flatMap(plugin => {
  const items: Array<{ plugin: Plugin; kind: 'error' | 'update'; reason: string }> = []
  if (plugin.status === 'error') items.push({ plugin, kind: 'error', reason: plugin.errorMessage || '加载失败' })
  else if (plugin.hasUpdate) items.push({ plugin, kind: 'update', reason: `可更新到 v${plugin.latestVersion}` })
  return items
}))

// ---------- 已安装: config workspace ----------

const configOpen = ref(false)
const configPlugin = ref<Plugin | null>(null)

function openConfig(plugin: Plugin) {
  configPlugin.value = plugin
  configOpen.value = true
}

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
  market.addDirect(repo)
}

function addCatalog(name: string, url: string) {
  discoverView.value = 'catalog'
  market.addSource(name, url)
}

const sourceRepo = computed(() => githubRepoOf(market.sourceRepository.value))

const directList = computed(() => {
  const query = market.keyword.value.trim().toLowerCase()
  return market.directEntries.value.filter(entry => !query
    || [entry.plugin.name, entry.repo.owner, entry.repo.repo, entry.repo.domain].some(value => value.toLowerCase().includes(query)))
    .sort((a, b) => Number(Boolean(a.plugin.installed)) - Number(Boolean(b.plugin.installed)))
})

function directTone(entry: DirectEntry) {
  if (entry.loading) return 'neutral'
  if (entry.plugin.installed) return 'primary'
  return market.isHealthy(entry.plugin) ? 'success' : entry.plugin.health.status === 'error' ? 'error' : 'warning'
}

function directStatus(entry: DirectEntry) {
  if (entry.loading) return '识别中'
  if (entry.plugin.installed) return '已安装'
  return market.isHealthy(entry.plugin) ? '可安装' : market.healthLabel(entry.plugin.health.status)
}

const activeDiscoverPlugins = computed(() => discoverView.value === 'direct'
  ? directList.value.map(entry => entry.plugin)
  : discoverList.value)

// Keep a valid selection in 发现 as the source, filters or resolved repos change.
watch(activeDiscoverPlugins, list => {
  const current = market.selectedPlugin.value
  if (!current || !list.some(plugin => plugin.repository === current.repository && plugin.id === current.id)) {
    market.selectedPlugin.value = list[0] ?? null
  }
}, { immediate: true })

const detailHasContent = computed(() => tab.value === 'installed' ? Boolean(installed.selectedPlugin.value) : Boolean(market.selectedPlugin.value))

// Results of actions show as snackbars, then clear so the same text can appear again later.
function toast(text: string, type: 'success' | 'warning' | 'error', clear: () => void) {
  if (!text) return
  const sticky = type !== 'success'
  ElMessage({ message: text, type, duration: sticky ? 6000 : 3000, showClose: sticky, grouping: true })
  clear()
}

watch(() => installed.actionMessage.value, text => toast(text, installed.actionMessageType.value, () => { installed.actionMessage.value = '' }))
watch(() => market.feedbackMessage.value, text => toast(text, market.feedbackType.value, () => { market.feedbackMessage.value = '' }))
</script>

<style scoped src="./PluginsHub.css"></style>
