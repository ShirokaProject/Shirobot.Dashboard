<template>
  <article v-if="plugin" class="detail">
    <header class="detail-head">
      <div class="detail-title">
        <h2>{{ plugin.name }}</h2>
        <p>{{ authors }}<span class="sep">·</span>{{ category }}</p>
      </div>
      <span class="version mono">{{ plugin.release.version ? `v${plugin.release.version}` : '无版本' }}</span>
    </header>

    <p class="detail-desc">{{ plugin.description }}</p>

    <div v-if="!healthy || plugin.deprecated" class="notice">
      <MdIcon name="error" class="notice-icon" :class="plugin.deprecated ? 'error' : 'warning'" />
      <div>
        <strong>{{ plugin.deprecated ? '已弃用' : healthLabel }}</strong>
        <span>{{ plugin.health.message }}</span>
        <a v-if="!plugin.deprecated" class="notice-link" :href="DOCS_URL" target="_blank" rel="noopener noreferrer">查看发布规则<MdIcon name="open_in_new" /></a>
      </div>
    </div>

    <dl class="facts">
      <!-- Rows without a value are omitted rather than shown as dashes -->
      <div v-if="plugin.release.downloadCount !== null"><dt><MdIcon name="download" />下载</dt><dd>{{ plugin.release.downloadCount.toLocaleString() }} 次</dd></div>
      <div v-if="plugin.release.publishedAt"><dt><MdIcon name="calendar_today" />发布</dt><dd>{{ publishedAt }}</dd></div>
      <div v-if="plugin.license"><dt><MdIcon name="balance" />许可证</dt><dd>{{ plugin.license }}</dd></div>
      <div v-if="compatibility !== '—'"><dt><MdIcon name="extension" />声明兼容</dt><dd class="mono" title="插件目录声明的兼容范围；实际加载检查 DLL 的最低 API 要求和共享程序集 ABI，不按此范围禁止 1.0 以上宿主。">{{ compatibility }}</dd></div>
      <div>
        <dt>
          <GitHubIcon v-if="githubRepo" />
          <MdIcon v-else :name="otherRepo ? 'link' : 'code'" />仓库
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
            <span class="repo-text"><span class="repo-owner"><template v-for="piece in repoPathParts(githubRepo).owner" :key="piece">{{ piece }}<wbr /></template></span><template v-for="piece in repoPathParts(githubRepo).name" :key="piece">{{ piece }}<wbr /></template></span>
            <MdIcon name="open_in_new" class="external" />
          </a>
          <a
            v-else-if="otherRepo"
            class="repo-link"
            :href="otherRepo.href"
            target="_blank"
            rel="noopener noreferrer"
          ><SiteIcon :domain="otherRepo.domain" class="repo-avatar" /><span class="repo-text" :title="otherRepo.label"><span class="repo-owner"><template v-for="piece in repoPathParts(otherRepo.label).owner" :key="piece">{{ piece }}<wbr /></template></span><template v-for="piece in repoPathParts(otherRepo.label).name" :key="piece">{{ piece }}<wbr /></template></span><MdIcon name="open_in_new" class="external" /></a>
          <span v-else class="mono">{{ plugin.repository || '—' }}</span>
        </dd>
      </div>
    </dl>

    <p class="footnote">来自「{{ origin }}」· 安装时由 Shirobot 后端按仓库下载并校验。</p>

    <footer class="detail-foot">
      <button
        type="button"
        class="md-button filled wide"
        :disabled="!installable || preparing"
        @click="emit('install', plugin)"
      >
        <MdIcon name="download" />{{ installLabel }}
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GitHubIcon from '../../../components/GitHubIcon.vue'
import MdIcon from '../../../components/MdIcon.vue'
import SiteIcon from '../../../components/SiteIcon.vue'
import { DOCS_URL } from '../../../features/docs'
import type { MarketplacePlugin } from '../../../api'
import { githubRepoOf, otherRepoOf, repoPathParts } from '../../../features/plugins/catalogSources'

const props = defineProps<{
  plugin: MarketplacePlugin | null
  authors: string
  category: string
  publishedAt: string
  compatibility: string
  healthy: boolean
  healthLabel: string
  installable: boolean
  installLabel: string
  preparing: boolean
  /** Where this entry came from: a catalog's name or 直接添加的仓库 */
  origin: string
}>()

const emit = defineEmits<{ install: [plugin: MarketplacePlugin] }>()

// GitHub repos (slug or URL) link to github.com with the owner's avatar; other https
// URLs link as host/path; anything else stays plain text.
const githubRepo = computed(() => githubRepoOf(props.plugin?.repository ?? ''))
const otherRepo = computed(() => githubRepo.value ? null : otherRepoOf(props.plugin?.repository ?? ''))
const avatarFailed = ref(false)
watch(githubRepo, () => { avatarFailed.value = false })
</script>

<style scoped src="./detail.css"></style>
