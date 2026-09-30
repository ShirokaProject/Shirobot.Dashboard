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
      <div v-if="menuOpen" class="session-menu" role="menu">
        <span class="menu-label">切换后端</span>
        <button
          v-for="backend in backends"
          :key="backend.id"
          type="button"
          role="menuitemradio"
          class="backend-item"
          :aria-checked="backend.id === session?.backendId"
          :disabled="switchingId !== ''"
          @click="switchTo(backend)"
        >
          <el-icon class="check"><Check v-if="backend.id === session?.backendId" /></el-icon>
          <span class="backend-text">
            <strong>{{ backend.name }}</strong>
            <small>{{ switchingId === backend.id ? '连接中…' : describeBaseUrl(backend.baseUrl) }}</small>
          </span>
          <el-icon v-if="backend.token" class="key" title="已记住密钥"><Key /></el-icon>
        </button>
        <hr />
        <button type="button" role="menuitem" @click="openLogin({ add: '' })">
          <el-icon class="check"><Plus /></el-icon>添加后端…
        </button>
        <button type="button" role="menuitem" class="danger" @click="logout">
          <el-icon class="check"><SwitchButton /></el-icon>退出登录
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Check, Key, Plus, SwitchButton } from '@element-plus/icons-vue'
import { describeBaseUrl, listBackends, type BackendProfile } from '../../auth/backends'
import { clearDashboardSession, getDashboardSession, getSessionModeLabel, getSessionStatusLabel } from '../../auth/session'
import { reloadIntoDashboard, signInToBackend } from '../../auth/signIn'

const router = useRouter()
const menuOpen = ref(false)
const sessionRoot = ref<HTMLElement | null>(null)
const session = computed(() => getDashboardSession())
const modeLabel = computed(() => getSessionModeLabel(session.value))
const statusLabel = computed(() => getSessionStatusLabel(session.value))
const backends = ref<BackendProfile[]>([])
const switchingId = ref('')

watch(menuOpen, open => {
  if (open) backends.value = listBackends()
})

function openLogin(query: Record<string, string>) {
  menuOpen.value = false
  void router.push({ name: 'Login', query: { switch: '', ...query } })
}

// A remembered key switches in place; otherwise the login page opens with that backend picked.
async function switchTo(backend: BackendProfile) {
  if (backend.id === session.value?.backendId) {
    menuOpen.value = false
    return
  }
  if (backend.token === undefined) {
    openLogin({ backend: backend.id })
    return
  }

  switchingId.value = backend.id
  const result = await signInToBackend(backend, backend.token, true)
  switchingId.value = ''
  if (result.ok) {
    reloadIntoDashboard()
    return
  }
  ElMessage.error(result.message)
  openLogin({ backend: backend.id })
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
  height: 40px;
  display: inline-grid;
  grid-template-columns: 8px minmax(0, 1fr);
  align-items: center;
  gap: var(--md-space-3);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-small);
  padding: 0 var(--md-space-4) 0 var(--md-space-3);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  text-align: left;
  transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.session-chip:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface-variant) var(--md-sys-state-hover-opacity), transparent);
}

/* Status is carried by the dot alone: success = live backend, warning = demo data */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-outline);
}

.session-chip.api .status-dot {
  background: var(--md-sys-color-success);
}

.session-chip.demo .status-dot {
  background: var(--md-sys-color-warning);
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
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-label-medium);
}

.session-main small {
  font: var(--md-sys-typescale-label-small);
}

.session-menu {
  position: absolute;
  z-index: 40;
  top: calc(100% + var(--md-space-3));
  right: 0;
  width: 280px;
  display: flex;
  flex-direction: column;
  padding: var(--md-space-2) 0;
  border: 0;
  border-radius: var(--md-sys-shape-corner-extra-small);
  background: var(--md-sys-color-surface-container);
  box-shadow: var(--md-sys-elevation-level2);
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

/* M3 menu: full-bleed 48px items, leading icon slot, state layer on hover */
.menu-label {
  padding: var(--md-space-2) var(--md-space-4) var(--md-space-1);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium);
}

.session-menu hr {
  width: 100%;
  margin: var(--md-space-2) 0;
  border: 0;
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

.session-menu button {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
  border: 0;
  padding: var(--md-space-1) var(--md-space-4) var(--md-space-1) var(--md-space-3);
  background: transparent;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  font: var(--md-sys-typescale-label-large);
  text-align: left;
}

.session-menu button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) var(--md-sys-state-hover-opacity), transparent);
}

.session-menu button:disabled {
  cursor: default;
}

.session-menu .check {
  width: 24px;
  flex: 0 0 auto;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 18px;
}

.backend-item[aria-checked='true'] .check {
  color: var(--md-sys-color-primary);
}

.backend-text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.backend-text strong,
.backend-text small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.backend-text small {
  color: var(--md-sys-color-on-surface-variant);
  font: 400 12px / 16px var(--font-mono);
}

.session-menu .key {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 16px;
}

.session-menu button.danger,
.session-menu button.danger .check {
  color: var(--md-sys-color-error);
}

@media (max-width: 599px) {
  .session-chip {
    min-width: 0;
  }
}
</style>
