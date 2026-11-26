<template>
  <div class="md3-app-shell" :class="{ entering }">
    <AppDrawer />

    <section class="md3-main-area">
      <TopAppBar :title="currentPageName" />

      <main class="md3-content-area">
        <div class="md3-content-frame">
          <router-view v-slot="{ Component, route: viewRoute }">
            <PageTransition :component="Component" :transition-key="routeTransitionKey(viewRoute)" :name="transitionName" />
          </router-view>
        </div>
      </main>
    </section>

    <RememberKeyPrompt />

    <nav class="md3-bottom-bar" aria-label="主导航">
      <button
        v-for="item in navigationItems"
        :key="item.path"
        type="button"
        class="bottom-item"
        :class="{ active: isActiveRoute(item.path) }"
        @click="$router.push(item.path)"
      >
        <span class="bottom-indicator">
          <NavigationUpdateBadge :count="item.count" :text="item.badgeText" floating />
          <el-icon><component :is="item.icon" /></el-icon>
        </span>
        <span>{{ item.short }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'
import AppDrawer from './components/AppDrawer.vue'
import PageTransition, { type PageTransitionName } from './components/PageTransition.vue'
import TopAppBar from './components/TopAppBar.vue'
import RememberKeyPrompt from './components/RememberKeyPrompt.vue'
import { menuItems, navigationItems } from './navigation'
import NavigationUpdateBadge from './components/NavigationUpdateBadge.vue'
import { getInstalledPlugins } from '../api/plugins/plugins'
import { checkHostUpdate } from '../api/system/system'
import { getAdapterMarketAdapters } from '../api/adapters/adapters'
import { installedPluginSnapshot, pluginMarketSnapshot, adapterMarketSnapshot, hostUpdateSnapshot } from '../features/plugins/updateCounts'
import { consumeDashboardEntrance } from '../auth/signIn'
import { refreshDashboardMarketplace } from '../features/plugins/dashboardMarketplace'

installedPluginSnapshot.value = []
pluginMarketSnapshot.value = []
adapterMarketSnapshot.value = []
hostUpdateSnapshot.value = null
refreshDashboardMarketplace()
void getInstalledPlugins().catch(() => {})
void getAdapterMarketAdapters().catch(() => {})
void checkHostUpdate().catch(() => {})

// Right after a login the dashboard assembles itself piece by piece instead of appearing at once
const entering = ref(false)
let enteringTimer: number | undefined
onMounted(() => {
  if (!consumeDashboardEntrance()) return
  entering.value = true
  enteringTimer = window.setTimeout(() => { entering.value = false }, 1100)
})
onBeforeUnmount(() => window.clearTimeout(enteringTimer))

const route = useRoute()
const router = useRouter()

// Where a path sits in the sidebar, or -1 when the sidebar does not show it.
function navIndex(path: string) {
  return menuItems.findIndex(item => item.path === '/' ? path === '/' : path.startsWith(item.path))
}

// Pages follow the sidebar indicator's direction; anything else fades. Set in a guard so the
// name is in place before the old page starts to leave.
const transitionName = ref<PageTransitionName>('page-fade')
const removeGuard = router.beforeEach((to, from) => {
  const next = navIndex(to.path)
  const previous = navIndex(from.path)
  transitionName.value = next < 0 || previous < 0 || next === previous
    ? 'page-fade'
    : next > previous ? 'page-down' : 'page-up'
})
onBeforeUnmount(removeGuard)

// The page's name for the hidden heading; the overview's greeting card is its own headline.
const currentPageName = computed(() => {
  if (route.name === 'Overview') return ''
  return menuItems.find(item => isActiveRoute(item.path))?.label ?? 'Shirobot'
})

function isActiveRoute(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function routeTransitionKey(viewRoute: RouteLocationNormalizedLoaded) {
  return String(viewRoute.name ?? viewRoute.path)
}
</script>

<style scoped>
/*
 * Entrance after login, one motion language: everything rises/slides a few pixels while fading
 * in (decelerate), in reading order: sidebar, top bar, then the page's cards one after another.
 */
@keyframes shell-enter-side {
  from { opacity: 0; transform: translateX(-20px); }
}

@keyframes shell-enter-top {
  from { opacity: 0; transform: translateY(-10px); }
}

@keyframes shell-enter-card {
  from { opacity: 0; transform: translateY(14px); }
}

.md3-app-shell.entering :deep(.md3-drawer) {
  animation: shell-enter-side 420ms var(--md-sys-motion-easing-emphasized-decelerate) both;
}

.md3-app-shell.entering :deep(.md3-top-app-bar) {
  animation: shell-enter-top 380ms var(--md-sys-motion-easing-emphasized-decelerate) 80ms both;
}

.md3-app-shell.entering :deep(.page-route-view > *) {
  animation: shell-enter-card 460ms var(--md-sys-motion-easing-emphasized-decelerate) both;
}

.md3-app-shell.entering :deep(.page-route-view > :nth-child(1)) { animation-delay: 140ms; }
.md3-app-shell.entering :deep(.page-route-view > :nth-child(2)) { animation-delay: 200ms; }
.md3-app-shell.entering :deep(.page-route-view > :nth-child(3)) { animation-delay: 260ms; }
.md3-app-shell.entering :deep(.page-route-view > :nth-child(n + 4)) { animation-delay: 320ms; }

@media (prefers-reduced-motion: reduce) {
  .md3-app-shell.entering :deep(.md3-drawer),
  .md3-app-shell.entering :deep(.md3-top-app-bar),
  .md3-app-shell.entering :deep(.page-route-view > *) {
    animation: none;
  }
}

.md3-app-shell {
  min-height: 100vh;
  display: flex;
  background: var(--app-bg);
  color: var(--md-sys-color-on-surface);
}

.md3-main-area {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.md3-content-area {
  flex: 1;
  overflow: auto;
  box-sizing: border-box;
  padding: var(--md-space-6) var(--md-space-10) var(--md-space-10);
  width: 100%;
}

.md3-content-frame {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 80px - var(--md-space-6) - var(--md-space-10));
  overflow: visible;
}

.md3-bottom-bar {
  display: none;
  height: 80px;
  background: var(--md-sys-color-surface-container);
  align-items: center;
  justify-content: space-around;
  padding: 0 var(--md-space-2);
}

.bottom-item {
  min-width: 0;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--md-space-1);
  border: 0;
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  font: var(--md-sys-typescale-label-medium);
}

.bottom-indicator {
  position: relative;
  width: 56px;
  height: 32px;
  border-radius: var(--md-sys-shape-corner-full);
  display: grid;
  place-items: center;
  font-size: 22px;
}

.bottom-item.active .bottom-indicator {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.bottom-item.active {
  color: var(--md-sys-color-on-surface);
}

@media (min-width: 600px) and (max-width: 839px) {
  .md3-content-area {
    padding-inline: var(--md-space-6);
  }
}

@media (max-width: 599px) {
  .md3-app-shell {
    flex-direction: column;
  }

  .md3-main-area {
    min-height: 100dvh;
    /* Floating bar (64) plus its 12px gap above and below */
    padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  }

  .md3-content-area {
    padding: var(--md-space-3) var(--md-space-4) var(--md-space-6);
  }

  .md3-content-frame {
    min-height: calc(100dvh - 152px - env(safe-area-inset-bottom, 0px) - var(--md-space-3) - var(--md-space-6));
  }

  /* Floating pill: inset from the screen edges, frosted over the content scrolling underneath */
  .md3-bottom-bar {
    position: fixed;
    z-index: 50;
    right: var(--md-space-3);
    bottom: calc(var(--md-space-3) + env(safe-area-inset-bottom, 0px));
    left: var(--md-space-3);
    display: flex;
    height: 64px;
    padding: 0 var(--md-space-1);
    border: 1px solid var(--app-floating-bar-border);
    border-radius: var(--md-sys-shape-corner-full);
    background: var(--app-floating-bar-bg);
    -webkit-backdrop-filter: var(--app-frosted-blur);
    backdrop-filter: var(--app-frosted-blur);
    box-shadow: var(--app-floating-bar-shadow);
    box-sizing: border-box;
    order: 2;
  }

  .bottom-indicator {
    width: min(48px, 100%);
  }

  .bottom-item {
    min-height: 56px;
    justify-content: center;
    gap: 2px;
    font-size: 11px;
  }
}
</style>
