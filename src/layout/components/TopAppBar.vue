<template>
  <header class="md3-top-app-bar">
    <div class="title-block">
      <!-- The title scrolls in its slot with the page below it, same direction and timing -->
      <Transition :name="`title-${direction}`">
        <h1 :key="title" class="md3-page-title">{{ title || '\u00a0' }}</h1>
      </Transition>
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

withDefaults(defineProps<{
  title: string
  /** Which way the page under the bar is moving: matches PageTransition's names */
  direction?: 'fade' | 'down' | 'up'
}>(), {
  direction: 'fade'
})

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
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--md-space-6);
  padding: var(--md-space-5) var(--md-space-8) var(--md-space-3);
  background: var(--app-bg);
}

.title-block {
  position: relative;
  min-width: 0;
  /* Wide enough for any title, so a long one leaving is not cut to a short one's width */
  flex: 1;
  /* The slot the title scrolls through; the old one leaves past its edge */
  overflow: clip;
}

.title-block .md3-page-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Both titles share the slot for the switch, on the page's 240ms curve */
.title-fade-leave-active,
.title-down-leave-active,
.title-up-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  transition:
    opacity 140ms var(--app-ease-out),
    transform 240ms var(--app-ease-out);
}

.title-fade-enter-active,
.title-down-enter-active,
.title-up-enter-active {
  transition:
    opacity 200ms var(--app-ease-out),
    transform 240ms var(--app-ease-out);
}

.title-fade-leave-to,
.title-fade-enter-from,
.title-down-leave-to,
.title-down-enter-from,
.title-up-leave-to,
.title-up-enter-from {
  opacity: 0;
}

/* Its own height is the whole distance: the title rolls out of its slot as the next rolls in */
.title-down-leave-to { transform: translateY(-100%); }
.title-down-enter-from { transform: translateY(100%); }
.title-up-leave-to { transform: translateY(100%); }
.title-up-enter-from { transform: translateY(-100%); }

@media (prefers-reduced-motion: reduce) {
  .title-down-leave-to,
  .title-down-enter-from,
  .title-up-leave-to,
  .title-up-enter-from {
    transform: none;
  }
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
    min-height: 64px;
    align-items: center;
    flex-direction: row;
    gap: var(--md-space-2);
    padding: calc(var(--md-space-3) + env(safe-area-inset-top, 0px)) var(--md-space-4) var(--md-space-3);
  }

  .title-block {
    flex: 1;
  }

  .md3-page-title {
    font-size: 22px;
  }

  .top-actions-row {
    flex-shrink: 0;
    gap: var(--md-space-2);
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
  transition:
    background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    transform var(--app-motion-press) var(--app-ease-out);
}

.logout-button:active {
  transform: scale(0.95);
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
