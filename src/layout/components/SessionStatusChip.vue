<template>
  <div ref="sessionRoot" class="session-control">
    <button type="button" class="session-chip" :class="session?.mode ?? 'none'" @click="menuOpen = !menuOpen">
      <span class="status-dot" aria-hidden="true"></span>
      <span class="session-main">
        <strong>{{ modeLabel }}</strong>
        <small>{{ statusLabel }}</small>
      </span>
    </button>

    <Transition name="session-menu-fade">
      <div v-if="menuOpen" class="session-menu">
        <button type="button" @click="goLogin">切换登录</button>
        <button type="button" class="danger" @click="logout">退出登录</button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearDashboardSession, getDashboardSession, getSessionModeLabel, getSessionStatusLabel } from '../../auth/session'

const router = useRouter()
const menuOpen = ref(false)
const sessionRoot = ref<HTMLElement | null>(null)
const session = computed(() => getDashboardSession())
const modeLabel = computed(() => getSessionModeLabel(session.value))
const statusLabel = computed(() => getSessionStatusLabel(session.value))

function goLogin() {
  menuOpen.value = false
  router.push('/login')
}

function logout() {
  menuOpen.value = false
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
}

.session-chip.demo {
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
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
}

.session-main small {
  opacity: 0.72;
  font: var(--md-sys-typescale-body-small);
}

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
  border: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 54%, transparent);
  border-radius: var(--md-sys-shape-corner-large);
  background: color-mix(in srgb, var(--md-sys-color-surface-container-lowest) 94%, white 6%);
  box-shadow:
    0 18px 48px color-mix(in srgb, var(--md-sys-color-shadow) 18%, transparent),
    0 8px 18px color-mix(in srgb, var(--md-sys-color-shadow) 12%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 70%, transparent);
  transform-origin: top right;
}

.session-menu-fade-enter-active,
.session-menu-fade-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease,
    filter 160ms ease;
}

.session-menu-fade-enter-from,
.session-menu-fade-leave-to {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(-6px) scale(0.98);
}

.session-menu-fade-enter-to,
.session-menu-fade-leave-from {
  opacity: 1;
  filter: blur(0);
  transform: translateY(0) scale(1);
}

.session-menu button {
  height: 40px;
  border: 0;
  border-radius: var(--md-sys-shape-corner-medium);
  padding: 0 var(--md-space-3);
  background: transparent;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  font: var(--md-sys-typescale-label-large);
  text-align: left;
}

.session-menu button:hover {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.session-menu button.danger {
  color: var(--md-sys-color-error);
}

.session-menu button.danger:hover {
  background: var(--md-sys-color-error-container);
  color: var(--md-sys-color-on-error-container);
}

@media (max-width: 599px) {
  .session-chip {
    min-width: 0;
  }
}
</style>
