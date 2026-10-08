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

// Going into the config workspace slides forward, coming out slides back; every other
// change (sidebar destinations) fades through. Set in a guard so it is ready before the swap.
const isWorkspace = (name: unknown) => name === 'PluginConfig' || name === 'AdapterConfig'
const transitionName = ref<PageTransitionName>('md3-fade-through')
const removeGuard = router.beforeEach((to, from) => {
  if (isWorkspace(to.name) === isWorkspace(from.name)) transitionName.value = 'md3-fade-through'
  else transitionName.value = isWorkspace(to.name) ? 'md3-axis-forward' : 'md3-axis-back'
})
onBeforeUnmount(removeGuard)

// The overview's own greeting card is its headline, so the app bar stays untitled there.
const currentPageName = computed(() => {
  if (route.name === 'Overview') return ''
  return menuItems.find(item => isActiveRoute(item.path))?.label ?? 'Shirobot'
})

function isActiveRoute(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function routeTransitionKey(viewRoute: RouteLocationNormalizedLoaded) {
  // The config workspace switches plugins/adapters in place; keep it mounted across them.
  if (isWorkspace(viewRoute.name)) return 'config-workspace'
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
  min-height: calc(100vh - 96px - var(--md-space-6) - var(--md-space-10));
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
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
  }

  .md3-content-area {
    padding: var(--md-space-3) var(--md-space-4) var(--md-space-6);
  }

  .md3-content-frame {
    min-height: calc(100dvh - 136px - env(safe-area-inset-bottom, 0px) - var(--md-space-3) - var(--md-space-6));
  }

  .md3-bottom-bar {
    position: fixed;
    z-index: 50;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    width: 100%;
    height: calc(72px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    border-top: 1px solid var(--md-sys-color-outline-variant);
    box-sizing: border-box;
    overflow: hidden;
    order: 2;
  }

  .bottom-indicator {
    width: min(48px, 100%);
  }

  .bottom-item {
    min-height: 56px;
    justify-content: center;
    font-size: 11px;
  }
}
</style>
