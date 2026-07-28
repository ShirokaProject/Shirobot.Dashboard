<template>
  <section class="plugin-toolbar compact">
    <label class="plugin-search-container">
      <span class="search-icon" aria-hidden="true">
        <MaterialSymbol name="search" />
      </span>
      <input :value="keyword" type="search" placeholder="搜索插件" aria-label="搜索插件" @input="updateKeyword" />
      <button v-if="keyword" type="button" class="clear-search-button" aria-label="清空搜索" @click="emit('update:keyword', '')">
        <MaterialSymbol name="close" />
      </button>
    </label>

    <button type="button" class="upload-trigger-button" @click="emit('upload')">
      <span class="button-icon" aria-hidden="true">
        <MaterialSymbol name="upload" />
      </span>
      <span>新增插件</span>
    </button>
  </section>
</template>

<script setup lang="ts">
import MaterialSymbol from '../../../components/MaterialSymbol.vue'

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
