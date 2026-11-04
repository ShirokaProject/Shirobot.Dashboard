<template>
  <span v-if="official" class="official-badge" title="ShirokaProject 官方仓库">
    <MdIcon name="verified" aria-hidden="true" />官方
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MdIcon from './MdIcon.vue'
import { parseRepository } from '../features/plugins/catalogSources'
const props = defineProps<{ repository: string }>()
const official = computed(() => {
  const repo = parseRepository(props.repository)
  return repo?.host === 'github' && repo.owner.toLowerCase() === 'shirokaproject'
})
</script>

<style scoped>
.official-badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font-size: 11px;
  font-weight: 600;
  line-height: 16px;
  white-space: nowrap;
  vertical-align: middle;
}
.official-badge .md-icon { width: 14px; height: 14px; font-size: 14px; }
</style>
