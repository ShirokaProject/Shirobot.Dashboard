<template>
  <header class="md3-top-app-bar" :class="{ scrolled, hidden }">
    <!-- The sidebar already names the page; the heading stays for screen readers and outlines -->
    <h1 class="page-heading">{{ title }}</h1>
    <!-- Phones hide the drawer, so the top bar carries the brand instead -->
    <div class="mobile-brand">
      <img
        class="mobile-brand-avatar"
        :class="{ spinning: isAvatarSpinning }"
        :src="avatarUrl"
        alt="Shirobot"
        @click="triggerAvatarSpin"
      />
      <span class="mobile-brand-name" translate="no">Shirobot</span>
    </div>
    <div class="top-actions-row">
      <SessionStatusChip v-if="BACKEND_SWITCHING_ENABLED" />
      <button v-else type="button" class="logout-button" aria-label="退出登录" title="退出登录" @click="logout">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10M15 8l4 4-4 4M19 12H9" /></svg>
      </button>
      <ThemeControls />
    </div>
  </header>
</template>

<script setup lang="ts">
import SessionStatusChip from './SessionStatusChip.vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BACKEND_SWITCHING_ENABLED } from '../../auth/backends'
import { confirmLogout } from '../../auth/logout'
import ThemeControls from './ThemeControls.vue'
import avatarUrl from '../../assets/images/avatar.png'

defineProps<{
  title: string
}>()

const router = useRouter()
const route = useRoute()

// Same as the drawer brand: a tap spins the avatar and goes to the overview
const isAvatarSpinning = ref(false)
function triggerAvatarSpin() {
  if (isAvatarSpinning.value) return
  isAvatarSpinning.value = true
  if (route.path !== '/') router.push('/')
  window.setTimeout(() => {
    isAvatarSpinning.value = false
  }, 720)
}

// Frost the bar only once content scrolls under it; at the top it blends into the page.
// On phones it also slides away while scrolling down and comes back on the first scroll up.
const scrolled = ref(false)
const hidden = ref(false)
let lastY = 0
let frame = 0
function onScroll() {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    const y = Math.max(0, window.scrollY)
    const delta = y - lastY
    scrolled.value = y > 4
    if (y < 64) hidden.value = false
    else if (delta > 6) hidden.value = true
    else if (delta < -6) hidden.value = false
    if (Math.abs(delta) > 6 || y < 64) lastY = y
  })
}
onMounted(() => {
  lastY = window.scrollY
  scrolled.value = lastY > 4
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (frame) cancelAnimationFrame(frame)
})

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
  /* Only the actions are visible, at the trailing edge */
  justify-content: flex-end;
  gap: var(--md-space-6);
  padding: var(--md-space-5) var(--md-space-8) var(--md-space-3);
  background: var(--app-bg);
}

.page-heading {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.mobile-brand {
  display: none;
  min-width: 0;
  align-items: center;
  gap: var(--md-space-3);
  margin-right: auto;
  padding-left: var(--md-space-1);
}

.mobile-brand-avatar {
  flex: 0 0 auto;
  /* Same tile as the drawer brand, so the art sits on a background instead of floating in the corner */
  width: 40px;
  height: 40px;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-secondary-container);
  object-fit: cover;
}

.mobile-brand-avatar {
  cursor: pointer;
  transform-origin: center;
}

.mobile-brand-avatar.spinning {
  animation: avatar-spin 720ms var(--md-sys-motion-easing-standard);
}

@keyframes avatar-spin {
  from { transform: rotate(0deg) scale(1); }
  45% { transform: rotate(220deg) scale(1.08); }
  to { transform: rotate(360deg) scale(1); }
}

.mobile-brand-name {
  overflow: hidden;
  font: var(--md-sys-typescale-title-medium);
  color: var(--md-sys-color-on-surface);
  white-space: nowrap;
  text-overflow: ellipsis;
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

  .mobile-brand {
    display: flex;
  }

  .md3-top-app-bar {
    transition:
      background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
      box-shadow var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
      transform var(--md-sys-motion-duration-medium2) var(--md-sys-motion-easing-standard);
  }

  .md3-top-app-bar.hidden {
    transform: translateY(-100%);
  }

  .md3-top-app-bar.scrolled {
    background: var(--app-top-bar-frosted-bg);
    -webkit-backdrop-filter: var(--app-frosted-blur);
    backdrop-filter: var(--app-frosted-blur);
    box-shadow: 0 1px 0 var(--app-floating-bar-border);
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

@media (max-width: 599px) and (prefers-reduced-motion: reduce) {
  .md3-top-app-bar {
    transition: none;
  }
}
</style>
