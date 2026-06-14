<template>
  <header class="md3-top-app-bar">
    <div class="title-block">
      <h1 class="md3-page-title">{{ title }}</h1>
    </div>
    <div class="top-actions-row">
      <SessionStatusChip />
      <ThemeControls />
    </div>
  </header>
</template>

<script setup lang="ts">
import SessionStatusChip from './SessionStatusChip.vue'
import ThemeControls from './ThemeControls.vue'

defineProps<{
  title: string
}>()
</script>

<style scoped>
.md3-top-app-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  isolation: isolate;
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--md-space-6);
  padding: var(--md-space-6) var(--md-space-8) var(--md-space-4);
  background: color-mix(in srgb, var(--md-sys-color-surface) 46%, transparent);
  backdrop-filter: blur(24px) saturate(1.35);
  -webkit-backdrop-filter: blur(24px) saturate(1.35);
  box-shadow:
    0 12px 32px color-mix(in srgb, var(--md-sys-color-shadow) 8%, transparent);
}

.title-block {
  min-width: 0;
}

.top-actions-row {
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
}

@media (min-width: 600px) and (max-width: 839px) {
  .md3-top-app-bar {
    min-height: 88px;
    padding-inline: var(--md-space-6);
  }
}

@media (max-width: 599px) {
  .md3-top-app-bar {
    min-height: auto;
    align-items: flex-start;
    flex-direction: column;
    padding: var(--md-space-5) var(--md-space-4) var(--md-space-4);
  }
}
</style>
