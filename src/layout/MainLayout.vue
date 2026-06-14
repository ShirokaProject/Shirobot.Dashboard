<template>
  <div class="md3-app-shell">
    <AppDrawer />

    <section class="md3-main-area">
      <TopAppBar :title="currentPageName" />

      <main class="md3-content-area">
        <div class="md3-content-frame">
          <router-view v-slot="{ Component, route: viewRoute }">
            <PageTransition :component="Component" :transition-key="routeTransitionKey(viewRoute)" />
          </router-view>
        </div>
      </main>
    </section>

    <nav class="md3-bottom-bar" aria-label="主导航">
      <button
        v-for="item in menuItems"
        :key="item.path"
        type="button"
        class="bottom-item"
        :class="{ active: isActiveRoute(item.path) }"
        @click="$router.push(item.path)"
      >
        <span class="bottom-indicator">
          <el-icon><component :is="item.icon" /></el-icon>
        </span>
        <span>{{ item.short }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { useRoute } from 'vue-router'
import AppDrawer from './components/AppDrawer.vue'
import PageTransition from './components/PageTransition.vue'
import TopAppBar from './components/TopAppBar.vue'
import { menuItems } from './navigation'

const route = useRoute()

const currentPageName = computed(() => {
  return menuItems.find(item => isActiveRoute(item.path))?.label ?? 'Shirobot'
})

function isActiveRoute(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function routeTransitionKey(viewRoute: RouteLocationNormalizedLoaded) {
  if (viewRoute.name === 'PluginConfig') return viewRoute.fullPath
  return String(viewRoute.name ?? viewRoute.path)
}
</script>

<style scoped>
.md3-app-shell {
  min-height: 100vh;
  display: flex;
  background: var(--md-sys-color-surface);
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
  padding: 0 var(--md-space-8) var(--md-space-8);
  width: 100%;
}

.md3-content-frame {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 96px - var(--md-space-8));
  overflow: visible;
}

.md3-bottom-bar {
  display: none;
  height: 80px;
  background: var(--md-sys-color-surface-container-lowest);
  align-items: center;
  justify-content: space-around;
  padding: 0 var(--md-space-2);
}

.bottom-item {
  min-width: 64px;
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
  width: 56px;
  height: 32px;
  border-radius: var(--md-sys-shape-corner-full);
  display: grid;
  place-items: center;
  font-size: 22px;
}

.bottom-item.active .bottom-indicator {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
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
    min-height: calc(100vh - 80px);
  }

  .md3-content-area {
    padding: 0 var(--md-space-4) var(--md-space-6);
  }

  .md3-content-frame {
    min-height: calc(100vh - 80px - var(--md-space-6));
  }

  .md3-bottom-bar {
    display: flex;
    order: 2;
  }
}
</style>
