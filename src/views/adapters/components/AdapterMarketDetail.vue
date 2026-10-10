<template>
  <article v-if="entry" class="detail">
    <header class="detail-head">
      <div class="detail-title">
        <h2>{{ entry.name }}</h2>
        <p>{{ entry.authors.join('、') || '未知作者' }}<span class="sep">·</span>{{ entry.platform }}</p>
      </div>
      <span class="version mono">v{{ entry.version }}</span>
    </header>

    <p v-if="entry.description" class="detail-desc">{{ entry.description }}</p>

    <!-- Not installable: say why, and where the release rules are documented -->
    <div v-if="!healthy || entry.deprecated" class="notice">
      <MdIcon name="error" class="notice-icon" :class="entry.health === 'error' ? 'error' : 'warning'" />
      <div>
        <strong>{{ entry.deprecated ? '已弃用' : healthLabel }}</strong>
        <span v-if="entry.healthMessage">{{ entry.healthMessage }}</span>
        <a v-if="!entry.deprecated" class="notice-link" :href="DOCS_URL" target="_blank" rel="noopener noreferrer">查看发布规则<MdIcon name="open_in_new" /></a>
      </div>
    </div>

    <dl class="facts">
      <div><dt><MdIcon name="code" />ID</dt><dd class="mono">{{ entry.id }}</dd></div>
      <div v-if="entry.asset?.size"><dt><MdIcon name="deployed_code" />包大小</dt><dd>{{ formatSize(entry.asset.size) }}</dd></div>
      <AdapterMarketFacts :entry="entry" />
    </dl>

    <p class="footnote">来自「{{ origin }}」· 安装时由 Shirobot 后端从仓库下载并校验，确认后会短暂重载适配器。</p>

    <footer class="detail-foot">
      <button type="button" class="md-button filled wide" :disabled="!installable || preparing" @click="emit('install')">
        <MdIcon name="download" />{{ preparing ? '准备中…' : installable ? (entry.installedVersion ? '更新' : '安装') : entry.installedVersion && healthy && !entry.deprecated ? '已安装' : '不可安装' }}
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AdapterMarketFacts from './AdapterMarketFacts.vue'
import MdIcon from '../../../components/MdIcon.vue'
import type { AdapterMarketEntry } from '../../../api'
import { DOCS_URL } from '../../../features/docs'
import { isInstallableEntry } from '../../adapterMarket/AdapterMarket'

const props = defineProps<{
  entry: AdapterMarketEntry | null
  preparing: boolean
  /** Where this entry came from: a catalog's name or 直接添加的仓库 */
  origin: string
}>()
const emit = defineEmits<{ install: [] }>()

const healthy = computed(() => ['available', 'healthy', 'ok'].includes(props.entry?.health.toLowerCase() ?? ''))
const installable = computed(() => Boolean(props.entry) && isInstallableEntry(props.entry!))
const healthLabel = computed(() => ({
  resolving: '识别中',
  'no-release': '无合规发布',
  'asset-missing': '缺少适配器包',
  error: '无法访问仓库',
  unknown: '状态未知'
} as Record<string, string>)[props.entry?.health ?? ''] ?? `目录状态：${props.entry?.health}`)

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<style scoped src="../../plugins/components/detail.css"></style>
<style scoped>
</style>
