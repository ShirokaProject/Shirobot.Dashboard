<template>
  <div class="panel-empty">
    <span class="empty-icon" aria-hidden="true"><el-icon><component :is="icon" /></el-icon></span>
    <strong>{{ title }}</strong>
    <p v-if="detail">{{ detail }}</p>
    <button v-if="retry" type="button" class="retry" @click="emit('retry')">
      <el-icon><RefreshRight /></el-icon>重试
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { RefreshRight } from '@element-plus/icons-vue'

// Calm empty/unavailable state: neutral icon + muted copy, never a bare red error string.
defineProps<{
  icon: Component
  title: string
  detail?: string
  retry?: boolean
}>()

const emit = defineEmits<{ retry: [] }>()
</script>

<style scoped>
.panel-empty {
  flex: 1;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--md-space-1);
  padding: var(--md-space-6) var(--md-space-4);
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  margin-bottom: var(--md-space-2);
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font-size: 22px;
}

strong {
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-title-small);
}

p {
  max-width: 260px;
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.retry {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: var(--md-space-1);
  margin-top: var(--md-space-2);
  padding: 0 var(--md-space-3);
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: var(--md-sys-color-primary);
  cursor: pointer;
  font: var(--md-sys-typescale-label-large);
}

.retry:hover {
  background: color-mix(in srgb, var(--md-sys-color-primary) var(--md-sys-state-hover-opacity), transparent);
}
</style>
