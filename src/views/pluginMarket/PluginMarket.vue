<template>
  <div class="market-page">
    <section class="market-hero">
      <div class="market-heading">
        <span>插件目录</span>
        <strong>{{ marketplacePlugins.length }} 个插件</strong>
        <small>目录生成于 {{ generatedAt }}</small>
      </div>

      <label class="market-search" aria-label="搜索插件">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9.5 4a5.5 5.5 0 0 1 4.39 8.81l4.65 4.65-1.08 1.08-4.65-4.65A5.5 5.5 0 1 1 9.5 4Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        </svg>
        <input v-model="keyword" type="search" placeholder="搜索插件、作者、仓库或健康状态" />
      </label>
    </section>

    <section class="market-controls" aria-label="插件市场筛选">
      <div class="market-control-group">
        <span class="control-label">分类</span>
        <div class="market-category-row" aria-label="插件分类">
          <button
            v-for="category in categories"
            :key="category"
            type="button"
            class="category-chip"
            :class="{ active: activeCategory === category }"
            @click="activeCategory = category"
          >
            {{ category }}
          </button>
        </div>
      </div>

      <div class="market-control-group align-end">
        <span class="control-label">排序</span>
        <div class="control-segmented" role="group" aria-label="排序">
          <button
            v-for="option in sortOptions"
            :key="option.value"
            type="button"
            class="control-segment"
            :class="{ active: activeSort === option.value }"
            :aria-pressed="activeSort === option.value"
            @click="activeSort = option.value"
          >
            {{ option.label }}
          </button>
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
      <article v-for="plugin in filteredPlugins" :key="plugin.id" class="market-card">
        <div class="market-card-top">
          <div class="plugin-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M9.5 3a2.5 2.5 0 0 1 4.9.5H16a2 2 0 0 1 2 2v3.1a2.5 2.5 0 0 1 .5 4.9H18V18a2 2 0 0 1-2 2h-3.1a2.5 2.5 0 0 1-4.8 0H5a2 2 0 0 1-2-2v-3.1a2.5 2.5 0 0 1 0-4.8V5.5a2 2 0 0 1 2-2h4.1A2.5 2.5 0 0 1 9.5 3Zm0 1.5a1 1 0 0 0-1 1v1.4H5a.5.5 0 0 0-.5.5v4.4l-.62-.14a1 1 0 1 0 0 1.95l.62-.14V18a.5.5 0 0 0 .5.5h4.4l-.14.62a1 1 0 1 0 1.95 0l-.14-.62H16a.5.5 0 0 0 .5-.5v-6h1.4a1 1 0 1 0 0-2h-1.4V5.5A.5.5 0 0 0 16 5h-3.1l.14-.62a1 1 0 1 0-1.95 0L11.24 5H9.5a1 1 0 0 1 0-.5Z" />
            </svg>
          </div>

          <div class="market-card-title">
            <h3>{{ plugin.name }}</h3>
            <p>{{ formatAuthors(plugin) }}</p>
          </div>

          <span class="market-version">{{ plugin.release.version ? `v${plugin.release.version}` : '无版本' }}</span>
        </div>

        <div class="market-badges">
          <span class="market-badge category">{{ plugin.category }}</span>
          <span class="market-badge health" :class="healthTone(plugin.health.status)">{{ healthLabel(plugin.health.status) }}</span>
          <span v-if="plugin.release.prerelease" class="market-badge warning">预发布</span>
          <span v-if="plugin.deprecated" class="market-badge error">已弃用</span>
        </div>

        <p class="market-desc">{{ plugin.description }}</p>
        <p class="market-health-message" :title="plugin.health.message">{{ plugin.health.message }}</p>

        <div class="market-meta">
          <span :title="plugin.release.downloadCount === null ? '' : `${plugin.release.downloadCount.toLocaleString()} downloads`">{{ formatDownloads(plugin.release.downloadCount) }} 次下载</span>
          <span>{{ formatDate(plugin.release.publishedAt) }}</span>
          <span>{{ plugin.kind }}</span>
          <span>{{ formatCompatibility(plugin) }}</span>
        </div>

        <div v-if="plugin.installed" class="market-installed" :class="{ enabled: plugin.installed.enabled }">
          <span>{{ plugin.installed.enabled ? '已安装并启用' : '已安装但未启用' }}</span>
          <strong>v{{ plugin.installed.version }}</strong>
        </div>

        <div class="market-actions">
          <button type="button" class="market-action text" @click="showPluginDetails(plugin)">详情</button>
          <button
            type="button"
            class="market-action tonal"
            :disabled="!canInstallPlugin(plugin) || Boolean(preparingPluginId)"
            :title="canInstallPlugin(plugin) ? '' : '该目录项当前不可安全安装'"
            @click="preparePluginInstall(plugin)"
          >
            {{ installButtonLabel(plugin) }}
          </button>
        </div>
      </article>

      <el-empty
        v-if="!loading && !filteredPlugins.length"
        :description="marketplacePlugins.length ? '没有匹配当前搜索或分类的插件。' : '插件目录暂无数据。'"
      />
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
        <div class="market-dialog-actions">
          <button type="button" class="market-action text" @click="detailVisible = false">关闭</button>
          <button
            v-if="selectedPlugin"
            type="button"
            class="market-action tonal"
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
import PluginUploadDialog from '../plugin/components/PluginUploadDialog.vue'
import { usePluginMarketPage } from './PluginMarket'

const {
  keyword,
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
  installDialogTitle,
  sortOptions,
  categories,
  generatedAt,
  marketplacePlugins,
  filteredPlugins,
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
  formatCompatibility
} = usePluginMarketPage()
</script>

<style scoped src="./PluginMarket.css"></style>
