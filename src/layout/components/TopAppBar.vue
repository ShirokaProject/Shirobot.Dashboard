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
  border-bottom: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 58%, transparent);
  background: color-mix(in srgb, var(--md-sys-color-surface) 72%, transparent);
  box-shadow: 0 2px 6px color-mix(in srgb, var(--md-sys-color-shadow) 10%, transparent);
  backdrop-filter: blur(28px) saturate(1.16);
  -webkit-backdrop-filter: blur(28px) saturate(1.16);
  transition:
    background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    border-color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .md3-top-app-bar {
    background: color-mix(in srgb, var(--md-sys-color-surface) 92%, var(--md-sys-color-surface-container-high));
  }
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

  .top-actions-row :deep(.expand-panel) {
    position: fixed;
    top: 136px;
    right: var(--md-space-4);
    left: var(--md-space-4);
    width: auto;
    max-height: calc(100dvh - 232px);
    overflow-y: auto;
  }
}
</style>
