<template>
  <header class="md3-top-app-bar">
    <div class="title-block">
      <h1 class="md3-page-title">{{ title }}</h1>
    </div>
    <div class="top-actions-row">
      <SessionStatusChip v-if="BACKEND_SWITCHING_ENABLED" />
      <button v-else type="button" class="logout-button" aria-label="退出登录" title="退出登录" @click="logout">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v9M6.4 6.6a8 8 0 1 0 11.2 0" /></svg>
      </button>
      <ThemeControls />
    </div>
  </header>
</template>

<script setup lang="ts">
import SessionStatusChip from './SessionStatusChip.vue'
import { useRouter } from 'vue-router'
import { BACKEND_SWITCHING_ENABLED } from '../../auth/backends'
import { confirmLogout } from '../../auth/logout'
import ThemeControls from './ThemeControls.vue'

defineProps<{
  title: string
}>()

const router = useRouter()

function logout() {
  void confirmLogout(router)
}
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
  background: var(--app-bg);
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

.logout-button {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.logout-button:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface-variant) var(--md-sys-state-hover-opacity), transparent);
}

.logout-button svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
