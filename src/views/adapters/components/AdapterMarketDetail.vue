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
    <div v-if="!installable" class="notice">
      <MdIcon name="error" class="notice-icon" :class="entry.health === 'error' ? 'error' : 'warning'" />
      <div>
        <strong>{{ healthLabel }}</strong>
        <span v-if="entry.healthMessage">{{ entry.healthMessage }}</span>
        <a class="notice-link" :href="DOCS_URL" target="_blank" rel="noopener noreferrer">查看发布规则<MdIcon name="open_in_new" /></a>
      </div>
    </div>

    <dl class="facts">
      <div v-if="entry.downloadCount !== null"><dt><MdIcon name="download" />下载</dt><dd>{{ entry.downloadCount.toLocaleString() }} 次</dd></div>
      <div><dt><MdIcon name="code" />ID</dt><dd class="mono">{{ entry.id }}</dd></div>
      <div v-if="entry.asset?.size"><dt><MdIcon name="deployed_code" />包大小</dt><dd>{{ formatSize(entry.asset.size) }}</dd></div>
      <div>
        <dt>
          <GitHubIcon v-if="githubRepo" />
          <MdIcon v-else name="link" />仓库
        </dt>
        <dd>
          <a
            v-if="githubRepo"
            class="repo-link"
            :href="`https://github.com/${githubRepo}`"
            target="_blank"
            rel="noopener noreferrer"
            :title="`在 GitHub 上打开 ${githubRepo}`"
          >
            <img
              v-if="!avatarFailed"
              class="repo-avatar"
              :src="`https://github.com/${githubRepo.split('/')[0]}.png?size=40`"
              alt=""
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="avatarFailed = true"
            />
            <span class="repo-text">{{ githubRepo }}</span>
            <MdIcon name="open_in_new" class="external" />
          </a>
          <span v-else class="mono">{{ entry.repository || '—' }}</span>
        </dd>
      </div>
    </dl>

    <p class="footnote">来自「{{ origin }}」· 安装时由 Shirobot 后端从仓库下载并校验，确认后会短暂重载适配器。</p>

    <footer class="detail-foot">
      <button type="button" class="md-button filled wide" :disabled="!installable || preparing" @click="emit('install')">
        <MdIcon name="download" />{{ preparing ? '准备中…' : installable ? '安装' : '不可安装' }}
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GitHubIcon from '../../../components/GitHubIcon.vue'
import MdIcon from '../../../components/MdIcon.vue'
import type { AdapterMarketEntry } from '../../../api'
import { DOCS_URL } from '../../../features/docs'
import { githubRepoOf } from '../../../features/plugins/catalogSources'
import { isInstallableEntry } from '../../adapterMarket/AdapterMarket'

const props = defineProps<{
  entry: AdapterMarketEntry | null
  preparing: boolean
  /** Where this entry came from: a catalog's name or 直接添加的仓库 */
  origin: string
}>()
const emit = defineEmits<{ install: [] }>()

const installable = computed(() => Boolean(props.entry) && isInstallableEntry(props.entry!))
const healthLabel = computed(() => ({
  resolving: '识别中',
  'no-release': '无合规发布',
  'asset-missing': '缺少适配器包',
  error: '无法访问仓库',
  unknown: '状态未知'
} as Record<string, string>)[props.entry?.health ?? ''] ?? `目录状态：${props.entry?.health}`)

const githubRepo = computed(() => githubRepoOf(props.entry?.repository ?? ''))
const avatarFailed = ref(false)
watch(githubRepo, () => { avatarFailed.value = false })

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<style scoped src="../../plugins/components/detail.css"></style>
<style scoped>
</style>
