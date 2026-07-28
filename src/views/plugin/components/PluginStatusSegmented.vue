<template>
  <section class="plugin-status-filters" role="radiogroup" aria-label="插件状态分类">
    <button
      v-for="filter in filters"
      :key="filter.key"
      type="button"
      role="radio"
      class="status-filter-chip"
      :class="[{ active: activeStatus === filter.key }, filter.key]"
      :aria-checked="activeStatus === filter.key"
      @click="emit('update:activeStatus', filter.key)"
    >
      <!-- M3 segmented button: check icon shown only on the selected segment -->
      <svg
        v-if="activeStatus === filter.key"
        class="status-segment-check"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M9.55 17.65 4.9 13l1.42-1.4 3.23 3.22 8.13-8.12L19.1 8.1Z" />
      </svg>
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
