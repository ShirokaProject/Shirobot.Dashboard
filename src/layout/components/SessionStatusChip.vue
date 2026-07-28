<template>
  <div ref="sessionRoot" class="session-control">
    <button
      type="button"
      class="session-chip"
      :class="session?.mode ?? 'none'"
      aria-haspopup="menu"
      :aria-expanded="menuOpen"
      @click="menuOpen = !menuOpen"
      @keydown.escape="menuOpen = false"
    >
      <span class="status-dot" aria-hidden="true"></span>
      <span class="session-main">
        <strong>{{ modeLabel }}</strong>
        <small>{{ statusLabel }}</small>
      </span>
    </button>

    <Transition name="session-menu-fade">
      <div v-if="menuOpen" class="session-menu" role="menu" @keydown.escape="menuOpen = false">
        <button type="button" role="menuitem" @click="goLogin">切换登录</button>
        <button type="button" role="menuitem" class="danger" @click="logout">退出登录</button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { clearDashboardSession, getDashboardSession, getSessionModeLabel, getSessionStatusLabel } from '../../auth/session'

const router = useRouter()
const route = useRoute()
const menuOpen = ref(false)
const sessionRoot = ref<HTMLElement | null>(null)
// Session lives in localStorage (not reactive); re-read whenever the route changes
const session = computed(() => {
  void route.fullPath
  return getDashboardSession()
})
const modeLabel = computed(() => getSessionModeLabel(session.value))
const statusLabel = computed(() => getSessionStatusLabel(session.value))

function goLogin() {
  menuOpen.value = false
  router.push('/login')
}

async function logout() {
  menuOpen.value = false
  try {
    await ElMessageBox.confirm('退出后需要重新连接才能继续管理。', '退出登录', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }
  clearDashboardSession()
  router.replace('/login')
}

function handleOutsidePointerDown(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (sessionRoot.value?.contains(target)) return
  menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown)
})
</script>

<style scoped>
.session-control {
  position: relative;
}

.session-chip {
  min-width: 132px;
  height: 44px;
  display: inline-grid;
  grid-template-columns: 10px minmax(0, 1fr);
  align-items: center;
  gap: var(--md-space-3);
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  padding: 0 var(--md-space-4);
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  cursor: pointer;
  text-align: left;
  transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.session-chip:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-secondary-container) 8%, var(--md-sys-color-secondary-container));
}

.session-chip:active {
  background: color-mix(in srgb, var(--md-sys-color-on-secondary-container) 10%, var(--md-sys-color-secondary-container));
}

.session-chip.demo {
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}

.session-chip.demo:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-tertiary-container) 8%, var(--md-sys-color-tertiary-container));
}

.session-chip.demo:active {
  background: color-mix(in srgb, var(--md-sys-color-on-tertiary-container) 10%, var(--md-sys-color-tertiary-container));
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--md-sys-shape-corner-full);
  background: currentColor;
  opacity: 0.82;
}

.session-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.session-main strong,
.session-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-main strong {
  font: var(--md-sys-typescale-label-large);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
}

.session-main small {
  opacity: 0.72;
  font: var(--md-sys-typescale-body-small);
  letter-spacing: var(--md-sys-typescale-body-small-tracking);
}

/* M3 menu: small corner, level2 elevation */
.session-menu {
  position: absolute;
  z-index: 40;
  top: calc(100% + var(--md-space-3));
  right: 0;
  min-width: 168px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--md-space-2);
  border: 0;
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-surface-container);
  box-shadow: var(--md-sys-elevation-level2);
  transform-origin: top right;
}

.session-menu-fade-enter-active {
  transition:
    opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-decelerate),
    transform var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-emphasized-decelerate);
}

.session-menu-fade-leave-active {
  transition:
    opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-emphasized-accelerate),
    transform var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-emphasized-accelerate);
}

.session-menu-fade-enter-from,
.session-menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.session-menu-fade-enter-to,
.session-menu-fade-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.session-menu button {
  height: 40px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-extra-small);
  padding: 0 var(--md-space-3);
  background: transparent;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  font: var(--md-sys-typescale-label-large);
  letter-spacing: var(--md-sys-typescale-label-large-tracking);
  text-align: left;
  transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.session-menu button:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent);
  color: var(--md-sys-color-on-surface);
}

.session-menu button:active {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, transparent);
}

.session-menu button.danger {
  color: var(--md-sys-color-error);
}

.session-menu button.danger:hover {
  background: color-mix(in srgb, var(--md-sys-color-error) 8%, transparent);
  color: var(--md-sys-color-error);
}

.session-menu button.danger:active {
  background: color-mix(in srgb, var(--md-sys-color-error) 10%, transparent);
}

@media (max-width: 599px) {
  .session-chip {
    min-width: 0;
  }
}
</style>
