<template>
  <section
    class="plugin-status-filters"
    :class="`indicator-${activeStatus}`"
    :style="{ '--segment-count': filters.length, '--active-index': activeIndex }"
    aria-label="插件状态分类"
  >
    <span class="status-indicator" aria-hidden="true"></span>
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
import { computed } from 'vue'
import type { PluginStatusFilter } from '../Plugins'

const props = defineProps<{
  filters: PluginStatusFilter[]
  activeStatus: PluginStatusFilter['key']
}>()

const emit = defineEmits<{
  'update:activeStatus': [value: PluginStatusFilter['key']]
}>()

const activeIndex = computed(() => Math.max(0, props.filters.findIndex(filter => filter.key === props.activeStatus)))
</script>

<style scoped src="./PluginStatusSegmented.css"></style>
