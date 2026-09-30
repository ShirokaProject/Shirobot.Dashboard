<template>
  <div class="market-page">
    <!-- Header card: catalog summary, search, then category + sort as connected groups -->
    <section class="market-hero panel" aria-label="插件目录">
      <div class="hero-row">
        <div class="market-heading">
          <span class="eyebrow">插件目录</span>
          <h2>{{ marketplacePlugins.length }} 个插件</h2>
          <p>
            目录生成于 {{ generatedAt }}
            <template v-if="installedCount"><span class="sep">·</span>已安装 {{ installedCount }}</template>
            <template v-if="updatableCount"><span class="sep">·</span><span class="accent">{{ updatableCount }} 个可更新</span></template>
          </p>
        </div>

        <div class="hero-tools">
          <label class="market-search" aria-label="搜索插件">
            <MdIcon name="search" />
            <input v-model="keyword" type="search" placeholder="搜索插件、作者或仓库" />
          </label>
          <button
            type="button"
            class="md-button tonal icon-only"
            :disabled="loading"
            :aria-label="refreshing ? '正在刷新目录' : '刷新目录'"
            :title="refreshing ? '正在刷新目录' : '从远端重新拉取插件目录'"
            @click="refreshMarketplacePlugins"
          >
            <MdIcon name="refresh" :class="{ spinning: refreshing }" />
          </button>
        </div>
      </div>

      <div class="filter-row">
        <div class="button-group" role="radiogroup" aria-label="插件分类">
          <button
            v-for="category in categories"
            :key="category"
            type="button"
            role="radio"
            class="md-button compact toggle"
            :class="{ selected: activeCategory === category }"
            :aria-checked="activeCategory === category"
            @click="activeCategory = category"
          >
            {{ category === '全部' ? category : categoryLabel(category) }}
          </button>
        </div>

        <div class="sort-group">
          <span class="sort-label">排序</span>
          <div class="button-group" role="radiogroup" aria-label="排序">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              role="radio"
              class="md-button compact toggle"
              :class="{ selected: activeSort === option.value }"
              :aria-checked="activeSort === option.value"
              @click="activeSort = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <el-alert
      v-if="loadError"
      class="page-alert"
      :title="loadError"
      type="warning"
      show-icon
      :closable="false"
    />

    <el-alert
      v-if="feedbackMessage"
      class="page-alert"
      :title="feedbackMessage"
      :type="feedbackType"
      show-icon
      closable
      @close="feedbackMessage = ''"
    />

    <section class="market-grid" :aria-busy="loading">
      <article v-for="plugin in filteredPlugins" :key="plugin.id" class="market-card panel">
        <header class="market-card-top">
          <span class="plugin-avatar" aria-hidden="true">{{ plugin.name.slice(0, 1).toUpperCase() }}</span>
          <div class="market-card-title">
            <h3>{{ plugin.name }}</h3>
            <p>{{ formatAuthors(plugin) }}<span class="sep">·</span>{{ categoryLabel(plugin.category) }}</p>
          </div>
          <span class="market-version mono">{{ plugin.release.version ? `v${plugin.release.version}` : '无版本' }}</span>
        </header>

        <p class="market-desc">{{ plugin.description }}</p>

        <!-- Only exceptions get badges; a healthy, stable release shows none -->
        <div v-if="!isHealthy(plugin) || plugin.release.prerelease || plugin.deprecated" class="market-flags">
          <span v-if="!isHealthy(plugin)" class="flag" :class="healthTone(plugin.health.status)" :title="plugin.health.message">
            <span class="status-dot" :class="healthTone(plugin.health.status) === 'error' ? 'error' : 'warning'" aria-hidden="true"></span>
            {{ healthLabel(plugin.health.status) }}
          </span>
          <span v-if="plugin.release.prerelease" class="flag"><span class="status-dot warning" aria-hidden="true"></span>预发布</span>
          <span v-if="plugin.deprecated" class="flag"><span class="status-dot error" aria-hidden="true"></span>已弃用</span>
        </div>

        <div class="market-meta">
          <span :title="plugin.release.downloadCount === null ? '' : `${plugin.release.downloadCount.toLocaleString()} 次下载`">
            <MdIcon name="download" />{{ formatDownloads(plugin.release.downloadCount) }}
          </span>
          <span><MdIcon name="calendar_today" />{{ formatDate(plugin.release.publishedAt) }}</span>
          <span class="mono compat" :title="formatCompatibility(plugin)">{{ formatCompatibility(plugin) }}</span>
        </div>

        <footer class="market-card-footer">
          <span v-if="plugin.installed" class="installed-state">
            <span class="status-dot" :class="plugin.installed.enabled ? 'primary' : ''" aria-hidden="true"></span>
            {{ plugin.installed.enabled ? '已启用' : '已安装未启用' }}
            <span class="mono">v{{ plugin.installed.version }}</span>
          </span>
          <span v-else></span>

          <div class="button-group" role="group" :aria-label="`${plugin.name} 操作`">
            <button type="button" class="md-button compact tonal" @click="showPluginDetails(plugin)">详情</button>
            <button
              type="button"
              class="md-button compact filled"
              :disabled="!canInstallPlugin(plugin) || Boolean(preparingPluginId)"
              :title="canInstallPlugin(plugin) ? '' : '该目录项当前不可安全安装'"
              @click="preparePluginInstall(plugin)"
            >
              {{ installButtonLabel(plugin) }}
            </button>
          </div>
        </footer>
      </article>

      <div v-if="!loading && !filteredPlugins.length" class="market-empty panel">
        <MdIcon name="search" />
        <strong>{{ marketplacePlugins.length ? '没有匹配的插件' : '插件目录暂无数据' }}</strong>
        <p>{{ marketplacePlugins.length ? '换个关键词或分类试试' : '点击右上角刷新重新拉取目录' }}</p>
      </div>
    </section>

    <el-dialog
      v-model="detailVisible"
      :title="selectedPlugin?.name || '插件详情'"
      width="640px"
      class="market-detail-dialog"
      append-to-body
      align-center
    >
      <div v-if="selectedPlugin" class="market-detail-content">
        <p class="market-detail-description">{{ selectedPlugin.description }}</p>
        <dl class="market-detail-list">
          <div><dt>ID</dt><dd>{{ selectedPlugin.id }}</dd></div>
          <div><dt>作者</dt><dd>{{ formatAuthors(selectedPlugin) }}</dd></div>
          <div><dt>版本</dt><dd>{{ selectedPlugin.release.version ? `v${selectedPlugin.release.version}` : '—' }}</dd></div>
          <div><dt>下载量</dt><dd>{{ selectedPlugin.release.downloadCount?.toLocaleString() ?? '—' }}</dd></div>
          <div><dt>许可证</dt><dd>{{ selectedPlugin.license || '—' }}</dd></div>
          <div><dt>兼容性</dt><dd>{{ formatCompatibility(selectedPlugin) }}</dd></div>
          <div><dt>资源</dt><dd>{{ selectedPlugin.release.asset ? `${selectedPlugin.release.asset.name} · ${formatSize(selectedPlugin.release.asset.size)}` : '—' }}</dd></div>
          <div class="wide"><dt>仓库</dt><dd><code>{{ selectedPlugin.repository }}</code></dd></div>
          <div class="wide"><dt>健康信息</dt><dd>{{ selectedPlugin.health.message }}</dd></div>
        </dl>
        <p class="market-url-note">目录中的 URL 仅作为文本展示；安装始终由当前 Shirobot 后端按仓库标识准备。</p>
      </div>

      <template #footer>
        <div class="market-dialog-actions button-group">
          <button type="button" class="md-button tonal" @click="detailVisible = false">关闭</button>
          <button
            v-if="selectedPlugin"
            type="button"
            class="md-button filled"
            :disabled="!canInstallPlugin(selectedPlugin) || Boolean(preparingPluginId)"
            @click="preparePluginInstall(selectedPlugin)"
          >
            {{ installButtonLabel(selectedPlugin) }}
          </button>
        </div>
      </template>
    </el-dialog>

    <PluginUploadDialog
      :visible="installDialogVisible"
      :title="installDialogTitle"
      :show-hero="false"
      :upload-result="installPreview"
      :upload-error="installError"
      :parsing="false"
      :installing="installConfirming"
      :replace="installReplace"
      :enable="installEnable"
      @update:visible="setInstallDialogVisible"
      @update:replace="installReplace = $event"
      @update:enable="installEnable = $event"
      @confirm="confirmMarketInstall"
    />
  </div>
</template>

<script setup lang="ts">
import MdIcon from '../../components/MdIcon.vue'
import PluginUploadDialog from '../plugin/components/PluginUploadDialog.vue'
import { usePluginMarketPage } from './PluginMarket'

const {
  keyword,
  activeCategory,
  activeSort,
  loading,
  refreshing,
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
  installDialogTitle,
  installedCount,
  updatableCount,
  isHealthy,
  sortOptions,
  categories,
  generatedAt,
  marketplacePlugins,
  filteredPlugins,
  refreshMarketplacePlugins,
  showPluginDetails,
  preparePluginInstall,
  setInstallDialogVisible,
  confirmMarketInstall,
  formatAuthors,
  formatDownloads,
  formatSize,
  formatDate,
  healthTone,
  healthLabel,
  installButtonLabel,
  canInstallPlugin,
  formatCompatibility,
  categoryLabel
} = usePluginMarketPage()
</script>

<style scoped src="./PluginMarket.css"></style>
