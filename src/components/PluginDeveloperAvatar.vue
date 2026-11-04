<template>
  <span class="developer-avatar" :title="`开发者：${developer}`" aria-hidden="true">
    <img v-if="login && !failed" :src="`https://github.com/${login}.png?size=80`" alt="" loading="lazy" referrerpolicy="no-referrer" @error="failed = true" />
    <span v-else>{{ developer.slice(0, 1).toUpperCase() }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PluginMarketAuthor } from '../api/pluginMarket/pluginMarket'
import { parseRepository } from '../features/plugins/catalogSources'
const props = defineProps<{ repository: string; authors: PluginMarketAuthor[] }>()
const validLogin = (value: string) => /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(value)
const login = computed(() => {
  for (const author of props.authors) {
    try {
      const url = new URL(author.url ?? '')
      const name = url.pathname.replace(/^\/|\/$/g, '')
      if (url.protocol === 'https:' && url.hostname.toLowerCase() === 'github.com' && validLogin(name)) return name
    } catch { /* An author can omit their profile URL. */ }
  }
  const author = props.authors.find(author => validLogin(author.name))
  if (author) return author.name
  const repo = parseRepository(props.repository)
  return repo?.host === 'github' ? repo.owner : null
})
const developer = computed(() => props.authors[0]?.name || login.value || '开发者')
const failed = ref(false)
watch(login, () => { failed.value = false })
</script>

<style scoped>
.developer-avatar {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 50%;
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 13px;
  font-weight: 600;
}
.developer-avatar img { width: 100%; height: 100%; object-fit: cover; }
</style>
