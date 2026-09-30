<template>
  <aside class="md3-drawer" :class="{ collapsed: isDrawerCollapsed }" aria-label="主导航">
    <div class="drawer-top">
      <button
        type="button"
        class="drawer-menu-button"
        :aria-label="isDrawerCollapsed ? '展开导航' : '收起导航'"
        :title="isDrawerCollapsed ? '展开导航' : '收起导航'"
        @click="isDrawerCollapsed = !isDrawerCollapsed"
      >
        <svg v-if="isDrawerCollapsed" class="drawer-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13ZM5.5 5.5v13h4v-13h-4Zm5.5 0v13h7.5v-13H11Zm2.72 4.03 2.47 2.47-2.47 2.47-1.06-1.06L14.07 12l-1.41-1.41 1.06-1.06Z" />
        </svg>
        <svg v-else class="drawer-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13ZM5.5 5.5v13h4v-13h-4Zm5.5 0v13h7.5v-13H11Zm5.34 5.09L14.93 12l1.41 1.41-1.06 1.06L12.81 12l2.47-2.47 1.06 1.06Z" />
        </svg>
      </button>
      <div class="brand">
        <img
          class="brand-avatar"
          :class="{ spinning: isAvatarSpinning }"
          :src="avatarUrl"
          alt="Shirobot"
          @click="triggerAvatarSpin"
        />
        <div class="brand-info">
          <div class="brand-name" translate="no">Shirobot</div>
          <div class="brand-caption" translate="no">
            <span>Dashboard</span>
            <span class="version-pill">v{{ DASHBOARD_VERSION }}</span>
          </div>
        </div>
      </div>
    </div>

    <nav class="drawer-tree">
      <button
        v-for="item in menuItems"
        :key="item.path"
        type="button"
        class="drawer-item"
        :class="{ active: isActiveRoute(item.path) }"
        @pointerenter="preloadNavTarget(item.path)"
        @focus="preloadNavTarget(item.path)"
        @click="router.push(item.path)"
      >
        <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
        <span class="drawer-label">{{ item.label }}</span>
        <span v-if="item.count" class="drawer-count">{{ item.count }}</span>
      </button>
    </nav>

    <div class="drawer-footer">
      <ThemeModeSwitch :collapsed="isDrawerCollapsed" />
    </div>
  </aside>

  <nav class="md3-rail" aria-label="主导航">
    <div class="rail-brand">
      <el-icon><Box /></el-icon>
    </div>
    <button
      v-for="item in menuItems"
      :key="item.path"
      type="button"
      class="rail-item"
      :class="{ active: isActiveRoute(item.path) }"
      @pointerenter="preloadNavTarget(item.path)"
      @focus="preloadNavTarget(item.path)"
      @click="router.push(item.path)"
    >
      <span class="rail-indicator">
        <el-icon><component :is="item.icon" /></el-icon>
      </span>
      <span class="rail-label">{{ item.short }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Box } from '@element-plus/icons-vue'
import avatarUrl from '../../assets/images/avatar.png'
import { preloadRouteComponent } from '../../router/pageLoaders'
import { menuItems } from '../navigation'
import { DASHBOARD_VERSION } from '../../version'
import ThemeModeSwitch from './ThemeModeSwitch.vue'

const route = useRoute()
const router = useRouter()

const isAvatarSpinning = ref(false)
const isDrawerCollapsed = ref(false)

function isActiveRoute(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function preloadNavTarget(path: string) {
  void preloadRouteComponent(path)
}

function triggerAvatarSpin() {
  if (isAvatarSpinning.value) return
  isAvatarSpinning.value = true
  if (route.path !== '/') router.push('/')
  window.setTimeout(() => {
    isAvatarSpinning.value = false
  }, 720)
}
</script>

<style scoped>
.md3-drawer {
  --drawer-motion-duration: 0.24s;
  --drawer-motion-easing: cubic-bezier(0.4, 0, 0.2, 1);
  position: sticky;
  top: 0;
  box-sizing: border-box;
  width: 296px;
  height: 100vh;
  flex: 0 0 296px;
  overflow: hidden;
  padding: var(--md-space-8) var(--md-space-3) var(--md-space-4);
  display: flex;
  flex-direction: column;
  background: var(--app-bg);
  transition:
    width var(--drawer-motion-duration) var(--drawer-motion-easing),
    flex-basis var(--drawer-motion-duration) var(--drawer-motion-easing),
    padding var(--drawer-motion-duration) var(--drawer-motion-easing);
}

.md3-drawer.collapsed {
  width: 88px;
  flex-basis: 88px;
  align-items: center;
  padding-inline: var(--md-space-2);
}

.md3-drawer.collapsed .drawer-top {
  align-self: stretch;
  gap: 0;
}

.md3-drawer.collapsed .drawer-menu-button {
  width: 56px;
  height: 56px;
}

.drawer-top {
  min-height: 56px;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--md-space-3);
  padding: 0 var(--md-space-2) var(--md-space-3);
  transition: gap var(--drawer-motion-duration) var(--drawer-motion-easing);
}

.drawer-menu-button {
  width: 48px;
  height: 48px;
  margin-left: 0;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  font-size: 24px;
  transition:
    margin-left var(--drawer-motion-duration) var(--drawer-motion-easing),
    width var(--drawer-motion-duration) var(--drawer-motion-easing),
    height var(--drawer-motion-duration) var(--drawer-motion-easing),
    background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.drawer-menu-button:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) var(--md-sys-state-hover-opacity), transparent);
}

.drawer-toggle-icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.brand {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
  overflow: hidden;
  transition: opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.md3-drawer.collapsed .brand {
  width: 0;
  opacity: 0;
  pointer-events: none;
}

.brand-avatar,
.brand-mark,
.rail-brand {
  width: 42px;
  height: 42px;
  border-radius: var(--md-sys-shape-corner-large);
  display: grid;
  place-items: center;
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.brand-avatar {
  flex: 0 0 auto;
  object-fit: cover;
  cursor: pointer;
  transform-origin: center;
}

.brand-avatar.spinning {
  animation: avatar-spin 720ms var(--md-sys-motion-easing-standard);
}

@keyframes avatar-spin {
  from { transform: rotate(0deg) scale(1); }
  45% { transform: rotate(220deg) scale(1.08); }
  to { transform: rotate(360deg) scale(1); }
}

.brand-info {
  min-width: 0;
  overflow: hidden;
  transition:
    max-width var(--drawer-motion-duration) var(--drawer-motion-easing),
    opacity 140ms ease,
    transform var(--drawer-motion-duration) var(--drawer-motion-easing);
}

.md3-drawer.collapsed .brand-info {
  max-width: 0;
  opacity: 0;
  transform: translateX(-8px);
  transition-duration: 0ms;
}

.md3-drawer:not(.collapsed) .brand-info {
  max-width: 180px;
  opacity: 1;
  transform: translateX(0);
}

.brand-name {
  font: var(--md-sys-typescale-title-medium);
  color: var(--md-sys-color-on-surface);
}

.brand-caption {
  display: flex;
  align-items: center;
  white-space: nowrap;
  gap: var(--md-space-2);
  font: var(--md-sys-typescale-body-small);
  color: var(--md-sys-color-on-surface-variant);
}

.version-pill {
  height: 20px;
  display: inline-flex;
  align-items: center;
  padding: 0 var(--md-space-2);
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--app-card);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium);
}

.drawer-footer {
  flex: 0 0 auto;
  align-self: stretch;
  margin-top: auto;
  padding: var(--md-space-3) var(--md-space-2) var(--md-space-1);
}

.drawer-tree {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--md-space-2);
  align-self: stretch;
  overflow-y: auto;
  margin-left: 0;
  padding: var(--md-space-1) 0;
  transition:
    margin-left var(--drawer-motion-duration) var(--drawer-motion-easing),
    width var(--drawer-motion-duration) var(--drawer-motion-easing);
}

.md3-drawer.collapsed .drawer-tree {
  width: 100%;
  align-items: flex-start;
  margin-left: 0;
}

.drawer-item,
.rail-item {
  border: 0;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
}

/* M3 navigation drawer item: 56dp height, full pill indicator */
.drawer-item {
  width: calc(100% - 8px);
  height: 56px;
  margin-left: var(--md-space-2);
  border-radius: var(--md-sys-shape-corner-full);
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 0 var(--md-space-6) 0 var(--md-space-2);
  font: var(--md-sys-typescale-label-large);
  text-align: left;
  transition:
    background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-short4),
    width var(--drawer-motion-duration) var(--drawer-motion-easing),
    height var(--drawer-motion-duration) var(--drawer-motion-easing),
    margin-left var(--drawer-motion-duration) var(--drawer-motion-easing),
    padding var(--drawer-motion-duration) var(--drawer-motion-easing);
}

.md3-drawer.collapsed .drawer-item {
  width: 56px;
  margin-left: 8px;
  padding: 0;
  border-radius: var(--md-sys-shape-corner-large);
}

.drawer-label {
  min-width: 0;
  max-width: 160px;
  flex: 0 1 auto;
  overflow: hidden;
  opacity: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  transform: translateX(0);
  transition:
    max-width var(--drawer-motion-duration) var(--drawer-motion-easing),
    opacity 140ms ease,
    transform var(--drawer-motion-duration) var(--drawer-motion-easing);
}

.md3-drawer.collapsed .drawer-label,
.md3-drawer.collapsed .drawer-count {
  max-width: 0;
  opacity: 0;
}

.drawer-count {
  max-width: 40px;
  flex: 0 0 auto;
  margin-left: auto;
  overflow: hidden;
  opacity: 1;
  transform: translateX(0);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium);
  transition:
    max-width var(--drawer-motion-duration) var(--drawer-motion-easing),
    opacity 140ms ease,
    transform var(--drawer-motion-duration) var(--drawer-motion-easing);
}

.drawer-item.active .drawer-count {
  color: currentColor;
}

.drawer-item:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) var(--md-sys-state-hover-opacity), transparent);
}

/* M3 active indicator: secondary-container */
.drawer-item.active {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.md3-drawer.collapsed .drawer-item:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) var(--md-sys-state-hover-opacity), transparent);
  color: var(--md-sys-color-on-surface-variant);
}

.md3-drawer.collapsed .drawer-item.active {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.nav-icon {
  width: 48px;
  height: 40px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  font-size: 21px;
  transition:
    width var(--drawer-motion-duration) var(--drawer-motion-easing),
    height var(--drawer-motion-duration) var(--drawer-motion-easing),
    font-size var(--drawer-motion-duration) var(--drawer-motion-easing);
}

.md3-drawer.collapsed .nav-icon {
  width: 56px;
  height: 56px;
  font-size: 23px;
}

.md3-rail {
  display: none;
  width: 80px;
  flex: 0 0 80px;
  padding: var(--md-space-3) 0;
  align-items: center;
  flex-direction: column;
  gap: var(--md-space-3);
  background: var(--app-bg);
}

.rail-item {
  width: 72px;
  min-height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--md-space-1);
  font: var(--md-sys-typescale-label-medium);
}

.rail-indicator {
  width: 56px;
  height: 32px;
  border-radius: var(--md-sys-shape-corner-full);
  display: grid;
  place-items: center;
  font-size: 22px;
}

.rail-item.active .rail-indicator {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.rail-item.active {
  color: var(--md-sys-color-on-surface);
}

@media (min-width: 600px) and (max-width: 839px) {
  .md3-drawer {
    display: none;
  }

  .md3-rail {
    display: flex;
  }
}

@media (max-width: 599px) {
  .md3-drawer,
  .md3-rail {
    display: none;
  }
}
</style>
