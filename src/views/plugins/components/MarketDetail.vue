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

    <MarketFacts :plugin="plugin" :published-at="publishedAt" :compatibility="compatibility" />

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
import MdIcon from '../../../components/MdIcon.vue'
import MarketFacts from './MarketFacts.vue'
import { DOCS_URL } from '../../../features/docs'
import type { MarketplacePlugin } from '../../../api'

defineProps<{
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

</script>

<style scoped src="./detail.css"></style>
