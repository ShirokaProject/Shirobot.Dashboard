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
          <div class="brand-name">Shirobot</div>
          <div class="brand-caption">
            <span>Dashboard</span>
            <span class="version-pill">v0.1.0</span>
          </div>
        </div>
      </div>
    </div>

    <button type="button" class="drawer-primary-action" @click="openPluginUpload">
      <el-icon><Plus /></el-icon>
      <span>新增插件</span>
    </button>

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
      <a class="brand-link" href="https://github.com/ShirokaProject" target="_blank" rel="noreferrer">
        <svg class="github-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 2C6.48 2 2 6.58 2 12.22c0 4.52 2.87 8.35 6.84 9.71.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.56 2.35 1.11 2.92.85.09-.66.35-1.11.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 5.95c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.09 10.09 0 0 0 22 12.22C22 6.58 17.52 2 12 2z" />
        </svg>
        <span>github.com/ShirokaProject</span>
      </a>
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
import { Box, Plus } from '@element-plus/icons-vue'
import avatarUrl from '../../assets/images/avatar.png'
import { preloadRouteComponent } from '../../router/pageLoaders'
import { menuItems } from '../navigation'

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

function openPluginUpload() {
  void preloadRouteComponent('/plugins')
  router.push({
    path: '/plugins',
    query: {
      upload: '1',
      intent: String(Date.now())
    }
  })
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
  padding: var(--md-space-4) var(--md-space-3);
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--md-sys-color-surface) 78%, var(--md-sys-color-surface-container-low));
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
  width: auto;
  gap: 0;
  justify-content: flex-start;
  padding-inline: 0;
}

.md3-drawer.collapsed .drawer-menu-button {
  width: 56px;
  height: 56px;
  margin-left: 8px;
}

.drawer-top {
  min-height: 64px;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--md-space-3);
  padding: 0 var(--md-space-2) var(--md-space-4);
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
  background: var(--md-sys-color-surface-container);
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
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
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
  background: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium);
}

.drawer-footer {
  flex: 0 0 auto;
  align-self: stretch;
  margin-top: auto;
  padding: var(--md-space-3) var(--md-space-2) var(--md-space-1);
}

.brand-link {
  height: 48px;
  display: flex;
  align-self: flex-start;
  align-items: center;
  box-sizing: border-box;
  gap: var(--md-space-3);
  min-width: 0;
  overflow: hidden;
  padding: 0 var(--md-space-3);
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-lowest);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
  text-decoration: none;
  white-space: nowrap;
  transition:
    width var(--drawer-motion-duration) var(--drawer-motion-easing),
    margin-left var(--drawer-motion-duration) var(--drawer-motion-easing),
    padding var(--drawer-motion-duration) var(--drawer-motion-easing),
    background var(--md-sys-motion-duration-short4),
    color var(--md-sys-motion-duration-short4);
}

.md3-drawer.collapsed .brand-link {
  width: 48px;
  gap: 0;
  margin-left: 4px;
  padding: 0 0 0 15px;
}

.md3-drawer.collapsed .brand-link span {
  max-width: 0;
  opacity: 0;
  transform: translateX(-8px);
  transition-duration: 0ms;
}

.brand-link span {
  min-width: 0;
  max-width: 180px;
  overflow: hidden;
  opacity: 1;
  text-overflow: ellipsis;
  transform: translateX(0);
  transition:
    max-width var(--drawer-motion-duration) var(--drawer-motion-easing),
    opacity 140ms ease,
    transform var(--drawer-motion-duration) var(--drawer-motion-easing);
}

.github-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  fill: currentColor;
  opacity: 0.82;
}

.brand-link:hover {
  color: var(--md-sys-color-primary);
}

.drawer-primary-action {
  width: 172px;
  height: 60px;
  display: inline-flex;
  align-self: flex-start;
  box-sizing: border-box;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-start;
  gap: var(--md-space-3);
  margin: 0 0 var(--md-space-4);
  padding: 0 0 0 40px;
  border: 0;
  border-radius: 20px;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  cursor: pointer;
  font: var(--md-sys-typescale-title-small);
  box-shadow: var(--md-sys-elevation-level1);
  transition:
    width var(--drawer-motion-duration) var(--drawer-motion-easing),
    height var(--drawer-motion-duration) var(--drawer-motion-easing),
    margin-left var(--drawer-motion-duration) var(--drawer-motion-easing),
    padding var(--drawer-motion-duration) var(--drawer-motion-easing),
    border-radius var(--drawer-motion-duration) var(--drawer-motion-easing),
    box-shadow var(--md-sys-motion-duration-short4);
}

.drawer-primary-action:hover {
  box-shadow: var(--md-sys-elevation-level2);
}

.drawer-primary-action .el-icon {
  font-size: 24px;
}

.md3-drawer.collapsed .drawer-primary-action {
  width: 56px;
  height: 56px;
  margin-left: 8px;
  gap: 0;
  padding-left: 16px;
  border-radius: var(--md-sys-shape-corner-large);
}

.md3-drawer.collapsed .drawer-primary-action span {
  max-width: 0;
  opacity: 0;
  transform: translateX(-8px);
  transition-duration: 0ms;
}

.drawer-primary-action span {
  max-width: 96px;
  overflow: hidden;
  opacity: 1;
  white-space: nowrap;
  transform: translateX(0);
  transition:
    max-width var(--drawer-motion-duration) var(--drawer-motion-easing),
    opacity 140ms ease,
    transform var(--drawer-motion-duration) var(--drawer-motion-easing);
}

.drawer-tree {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0;
  align-self: stretch;
  overflow-y: auto;
  margin-left: calc(-1 * var(--md-space-3));
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

.drawer-item {
  width: calc(100% - 8px);
  height: 40px;
  margin-left: 0;
  border-radius: 0 var(--md-sys-shape-corner-full) var(--md-sys-shape-corner-full) 0;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: center;
  padding: 0 var(--md-space-3) 0 0;
  font: var(--md-sys-typescale-title-small);
  letter-spacing: 0.01em;
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
  height: 56px;
  margin-left: 8px;
  grid-template-columns: 56px;
  justify-items: center;
  padding: 0;
  border-radius: var(--md-sys-shape-corner-large);
}

.drawer-label {
  min-width: 0;
  max-width: 160px;
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
  transform: translateX(-8px);
  transition-duration: 0ms;
}

.drawer-count {
  max-width: 40px;
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
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 7%, transparent);
}

.drawer-item.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.md3-drawer.collapsed .drawer-item:hover,
.md3-drawer.collapsed .drawer-item.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.nav-icon {
  width: 56px;
  height: 40px;
  display: grid;
  place-items: center;
  font-size: 21px;
  transition:
    width var(--drawer-motion-duration) var(--drawer-motion-easing),
    height var(--drawer-motion-duration) var(--drawer-motion-easing),
    font-size var(--drawer-motion-duration) var(--drawer-motion-easing);
}

.md3-drawer.collapsed .nav-icon {
  justify-self: center;
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
  background: var(--md-sys-color-surface);
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
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
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
