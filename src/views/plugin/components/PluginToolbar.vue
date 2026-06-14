<template>
  <section class="plugin-toolbar compact">
    <label class="plugin-search-container">
      <span class="search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
        </svg>
      </span>
      <input :value="keyword" type="search" placeholder="搜索插件" @input="updateKeyword" />
      <button v-if="keyword" type="button" class="clear-search-button" aria-label="清空搜索" @click="emit('update:keyword', '')">×</button>
    </label>

    <button type="button" class="upload-trigger-button" @click="emit('upload')">
      <span class="button-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 16V5m0 0 4 4m-4-4-4 4M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16" />
        </svg>
      </span>
      <span>新增插件</span>
    </button>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  keyword: string
}>()

const emit = defineEmits<{
  'update:keyword': [value: string]
  upload: []
}>()

function updateKeyword(event: Event) {
  emit('update:keyword', (event.target as HTMLInputElement).value)
}
</script>

<style scoped src="./PluginToolbar.css"></style>
