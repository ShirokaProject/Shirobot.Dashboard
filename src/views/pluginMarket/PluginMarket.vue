<template>
  <div class="market-page">
    <section class="market-home">
      <div class="market-intro">
        <div class="market-heading">
          <span class="market-eyebrow">探索 Shirobot 扩展</span>
          <strong>{{ marketplacePlugins.length }} 个插件</strong>
          <small>目录生成于 {{ generatedAt }}</small>
        </div>

        <label class="market-search" aria-label="搜索插件">
          <MaterialSymbol name="search" />
          <input v-model="keyword" type="search" placeholder="搜索插件、作者、仓库或健康状态" />
        </label>
      </div>

      <div
        v-if="showDiscovery && (recommendedPlugins.length || popularPlugins.length)"
        class="market-discovery"
        aria-label="插件发现"
      >
        <section v-if="recommendedPlugins.length" class="market-recommendations" aria-labelledby="recommendation-title">
          <div class="market-section-heading">
            <div>
              <span class="market-eyebrow">为目录探索提供起点</span>
              <h2 id="recommendation-title">开发者推荐</h2>
            </div>
            <p>依据可安装性、活跃度与下载量自动推荐</p>
          </div>

          <div class="recommendation-grid" :class="{ single: recommendedPlugins.length === 1 }">
            <article
              v-for="(plugin, index) in recommendedPlugins"
              :key="`recommended-${plugin.id}`"
              class="recommendation-card"
              :class="index === 0 ? 'primary' : 'secondary'"
              :style="{ animationDelay: `${index * 40}ms` }"
            >
              <div class="recommendation-card-main">
                <span class="market-badge category">{{ plugin.category }}</span>
                <h3>{{ plugin.name }}</h3>
                <p class="recommendation-author">{{ formatAuthors(plugin) }}</p>
                <p class="recommendation-description">{{ plugin.description }}</p>
                <div class="recommendation-meta">
                  <span>{{ formatDownloads(safeDownloads(plugin)) }} 次下载</span>
                  <span>{{ plugin.release.version ? `v${plugin.release.version}` : '无版本' }}</span>
                </div>
              </div>
              <div class="recommendation-actions">
                <button type="button" class="market-action text" @click="showPluginDetails(plugin)">详情</button>
                <button
                  type="button"
                  class="market-action tonal recommendation-cta"
                  :disabled="!canInstallPlugin(plugin) || Boolean(preparingPluginId)"
                  @click="preparePluginInstall(plugin)"
                >
                  {{ installButtonLabel(plugin) }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <aside v-if="popularPlugins.length" class="market-popular" aria-labelledby="popular-title">
          <div class="market-section-heading compact">
            <div>
              <span class="market-eyebrow">全目录下载排行</span>
              <h2 id="popular-title">热门插件</h2>
            </div>
          </div>
          <ol class="popular-list">
            <li v-for="(plugin, index) in popularPlugins" :key="`popular-${plugin.id}`">
              <button type="button" class="popular-action" :aria-label="`第 ${index + 1} 名，查看 ${plugin.name} 详情`" @click="showPluginDetails(plugin)">
                <span class="popular-rank" aria-hidden="true">{{ index + 1 }}</span>
                <span class="popular-copy">
                  <strong>{{ plugin.name }}</strong>
                  <small>{{ formatDownloads(safeDownloads(plugin)) }} 次下载</small>
                </span>
                <svg class="m3-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m13 19-1.4-1.4 4.6-4.6H5v-2h11.2l-4.6-4.6L13 5l7 7Z" />
                </svg>
              </button>
            </li>
          </ol>
        </aside>
      </div>
    </section>

    <section id="plugin-catalogue-heading" class="catalogue-surface" tabindex="-1">
      <header class="catalogue-heading">
        <div>
          <span class="market-eyebrow">浏览全部目录项</span>
          <h2>插件目录</h2>
        </div>
        <p><strong>{{ filteredCount }}</strong> 个匹配项 · {{ catalogueRange }}</p>
      </header>

      <div class="market-controls" aria-label="插件市场筛选">
        <div class="market-control-group">
          <span class="control-label">分类</span>
          <div class="market-category-row" role="group" aria-label="插件分类">
            <button
              v-for="category in categories"
              :key="category"
              type="button"
              class="md3-chip market-filter-chip"
              :aria-pressed="activeCategory === category"
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
              class="md3-chip market-segment-button"
              :aria-pressed="activeSort === option.value"
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
    >
      <button type="button" class="md3-text-button" @click="loadMarketplacePlugins">重试</button>
    </el-alert>

    <div v-if="feedbackMessage" aria-live="polite">
      <el-alert
        class="page-alert"
        :title="feedbackMessage"
        :type="feedbackType"
        show-icon
        closable
        @close="feedbackMessage = ''"
      />
    </div>

    <Transition name="catalogue-page" mode="out-in">
    <section :key="`${currentPage}-${activeCategory}-${activeSort}-${keyword}`" class="market-grid" :aria-busy="loading">
      <template v-if="loading && !filteredPlugins.length">
        <div v-for="n in 6" :key="`skeleton-${n}`" class="market-card skeleton" aria-hidden="true">
          <div class="skeleton-block avatar"></div>
          <div class="skeleton-block line wide"></div>
          <div class="skeleton-block line"></div>
          <div class="skeleton-block line short"></div>
        </div>
      </template>

      <article
        v-for="(plugin, index) in pagedPlugins"
        :key="plugin.id"
        class="market-card"
        :style="{ animationDelay: `${Math.min(index, 5) * 24}ms` }"
      >
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

        <div class="market-card-body">
          <div class="market-badges">
            <span class="market-badge category">{{ plugin.category }}</span>
            <span class="market-badge health" :class="healthTone(plugin.health.status)">{{ healthLabel(plugin.health.status) }}</span>
            <span v-if="plugin.release.prerelease" class="market-badge warning">预发布</span>
            <span v-if="plugin.deprecated" class="market-badge error">已弃用</span>
          </div>

          <p class="market-desc">{{ plugin.description }}</p>
          <p class="market-health-message" :title="plugin.health.message">{{ plugin.health.message }}</p>

          <div class="market-meta">
            <span class="market-meta-downloads" :title="plugin.release.downloadCount === null ? '' : `${plugin.release.downloadCount.toLocaleString()} downloads`">{{ formatDownloads(plugin.release.downloadCount) }} 次下载</span>
            <span class="market-meta-date">{{ formatDate(plugin.release.publishedAt) }}</span>
            <span class="market-meta-kind">{{ plugin.kind }}</span>
            <span class="market-meta-compatibility">{{ formatCompatibility(plugin) }}</span>
          </div>
        </div>

        <div class="market-card-footer">
          <div v-if="plugin.installed" class="market-installed" :class="{ enabled: plugin.installed.enabled }">
            <span>{{ plugin.installed.enabled ? '已安装并启用' : '已安装但未启用' }}</span>
            <strong>v{{ plugin.installed.version }}</strong>
          </div>

          <div class="market-actions">
            <button type="button" class="market-action text" @click="showPluginDetails(plugin)">
              <svg class="m3-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11 17h2v-6h-2Zm1-8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm0 13a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
              </svg>
              <span>详情</span>
            </button>
            <button
              type="button"
              class="market-action tonal"
              :disabled="!canInstallPlugin(plugin) || Boolean(preparingPluginId)"
              :title="canInstallPlugin(plugin) ? '' : '该目录项当前不可安全安装'"
              @click="preparePluginInstall(plugin)"
            >
              <svg class="m3-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 15.58 6.7 10.3l1.42-1.42 2.88 2.88V3h2v8.75l2.88-2.87 1.42 1.41ZM5 21a2 2 0 0 1-2-2v-4h2v4h14v-4h2v4a2 2 0 0 1-2 2Z" />
              </svg>
              <span>{{ installButtonLabel(plugin) }}</span>
            </button>
          </div>
        </div>
      </article>

      <el-empty
        v-if="!loading && !filteredPlugins.length"
        :description="marketplacePlugins.length ? '没有匹配当前搜索或分类的插件。' : '插件目录暂无数据。'"
      />
    </section>
    </Transition>

    <nav v-if="filteredCount > 6" class="market-pagination" aria-label="插件目录分页">
      <button type="button" class="pagination-direction" :disabled="currentPage === 1" @click="setPage(currentPage - 1)">
        <svg class="m3-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15.4 18-6-6 6-6 1.4 1.4-4.6 4.6 4.6 4.6Z" />
        </svg>
        <span>上一页</span>
      </button>
      <template v-for="token in pageTokens" :key="token">
        <span v-if="typeof token === 'string'" class="pagination-ellipsis" aria-hidden="true">…</span>
        <button
          v-else
          type="button"
          class="pagination-page"
          :aria-label="`第 ${token} 页`"
          :aria-current="currentPage === token ? 'page' : undefined"
          @click="setPage(token)"
        >
          {{ token }}
        </button>
      </template>
      <button type="button" class="pagination-direction" :disabled="currentPage === pageCount" @click="setPage(currentPage + 1)">
        <span>下一页</span>
        <svg class="m3-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m8.6 18-1.4-1.4 4.6-4.6-4.6-4.6L8.6 6l6 6Z" />
        </svg>
      </button>
    </nav>

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
          <button type="button" class="market-action text" @click="detailVisible = false">
            <svg class="m3-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.4 19 5 17.6 10.6 12 5 6.4 6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4Z" />
            </svg>
            <span>关闭</span>
          </button>
          <button
            v-if="selectedPlugin"
            type="button"
            class="market-action tonal"
            :disabled="!canInstallPlugin(selectedPlugin) || Boolean(preparingPluginId)"
            @click="preparePluginInstall(selectedPlugin)"
          >
            <svg class="m3-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15.58 6.7 10.3l1.42-1.42 2.88 2.88V3h2v8.75l2.88-2.87 1.42 1.41ZM5 21a2 2 0 0 1-2-2v-4h2v4h14v-4h2v4a2 2 0 0 1-2 2Z" />
            </svg>
            <span>{{ installButtonLabel(selectedPlugin) }}</span>
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
import MaterialSymbol from '../../components/MaterialSymbol.vue'
import PluginUploadDialog from '../plugin/components/PluginUploadDialog.vue'
import { usePluginMarketPage } from './PluginMarket'

const {
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
} = usePluginMarketPage()
</script>

<style scoped src="./PluginMarket.css"></style>
