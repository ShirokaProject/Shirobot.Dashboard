<template>
  <section class="plugin-status-filters" aria-label="插件状态分类">
    <button
      v-for="filter in filters"
      :key="filter.key"
      type="button"
      class="status-filter-chip"
      :class="[{ active: activeStatus === filter.key }, filter.key]"
      @click="emit('update:activeStatus', filter.key)"
    >
      <span class="status-segment-icon" aria-hidden="true">✦</span>
      <span class="status-segment-label">{{ filter.label }}</span>
      <strong>{{ filter.count }}</strong>
    </button>
  </section>
</template>

<script setup lang="ts">
import type { PluginStatusFilter } from '../Plugins'

defineProps<{
  filters: PluginStatusFilter[]
  activeStatus: PluginStatusFilter['key']
}>()

const emit = defineEmits<{
  'update:activeStatus': [value: PluginStatusFilter['key']]
}>()
</script>

<style scoped src="./PluginStatusSegmented.css"></style>
