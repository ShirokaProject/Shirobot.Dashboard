<template>
  <nav class="config-nav" aria-label="配置分类">
    <section v-if="groups.length" class="nav-section" aria-label="配置分组">
      <span class="nav-section-label">配置</span>
    <button
      v-for="group in groups"
      :key="group.key"
      type="button"
      class="nav-pill"
      :class="{ selected: view === group.key }"
      :aria-current="view === group.key ? 'true' : undefined"
      @click="emit('update:view', group.key)"
    >
      <span>{{ group.label }}</span>
      <small>{{ group.fields.length }}</small>
    </button>
    </section>
    <hr v-if="groups.length && (pages.length || pagesLoading || pagesError)" />
    <section v-if="pages.length || pagesLoading || pagesError" class="nav-section" aria-label="插件页面">
      <span class="nav-section-label">插件页面</span>
      <span v-if="pagesLoading" class="nav-note" role="status">加载中…</span>
      <template v-else-if="pagesError"><span class="nav-note error" role="alert">{{ pagesError }}</span><button type="button" class="md-button text compact" @click="emit('retry-pages')">重试</button></template>
      <button v-for="page in pages" :key="page.id" type="button" class="nav-pill"
        :class="{ selected: view === pluginPageView(page.id) }" :aria-current="view === pluginPageView(page.id) ? 'true' : undefined"
        @click="emit('update:view', pluginPageView(page.id))"><span>{{ page.title }}</span><MdIcon :name="page.icon || 'dashboard'" /></button>
    </section>
    <hr v-if="(groups.length || pages.length || pagesLoading || pagesError) && (showRoutes || showInstance || showListeners)" />
    <section v-if="showRoutes || showInstance || showListeners" class="nav-section" aria-label="路由与监听">
      <span class="nav-section-label">{{ showInstance ? '实例与路由' : '路由与监听' }}</span>
    <button
      v-if="showInstance"
      type="button"
      class="nav-pill"
      :class="{ selected: view === INSTANCE_VIEW }"
      :aria-current="view === INSTANCE_VIEW ? 'true' : undefined"
      @click="emit('update:view', INSTANCE_VIEW)"
    >
      <span>实例</span>
      <MdIcon name="code" />
    </button>
    <button
      v-if="showRoutes"
      type="button"
      class="nav-pill"
      :class="{ selected: view === ROUTES_VIEW }"
      :aria-current="view === ROUTES_VIEW ? 'true' : undefined"
      @click="emit('update:view', ROUTES_VIEW)"
    >
      <span>路由</span>
      <MdIcon name="link" />
    </button>
    <button
      v-if="showListeners"
      type="button"
      class="nav-pill"
      :class="{ selected: view === LISTENERS_VIEW }"
      :aria-current="view === LISTENERS_VIEW ? 'true' : undefined"
      @click="emit('update:view', LISTENERS_VIEW)"
    >
      <span>监听</span>
      <MdIcon name="hearing" />
    </button>
    </section>
  </nav>
</template>

<script setup lang="ts">
import MdIcon from '../../../components/MdIcon.vue'
import type { PluginPage } from '../../../api'
import { pluginPageView } from '../../pluginPages/usePluginPages'
import { INSTANCE_VIEW, LISTENERS_VIEW, ROUTES_VIEW, type ConfigGroup } from '../usePluginConfig'

withDefaults(
  defineProps<{ groups: ConfigGroup[]; view: string; showRoutes?: boolean; showInstance?: boolean; showListeners?: boolean; pages?: PluginPage[]; pagesLoading?: boolean; pagesError?: string }>(),
  { showRoutes: true, showInstance: false, showListeners: false, pages: () => [], pagesLoading: false, pagesError: '' }
)
const emit = defineEmits<{ 'update:view': [view: string]; 'retry-pages': [] }>()
</script>

<style scoped>
.config-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-section { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.nav-section-label, .nav-note { padding: var(--md-space-2) var(--md-space-4); color: var(--md-sys-color-on-surface-variant); font: var(--md-sys-typescale-label-small); }
.nav-note.error { color: var(--md-sys-color-error); }

.nav-pill {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--md-space-2);
  padding: 0 var(--md-space-4);
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  font: var(--md-sys-typescale-label-large);
  text-align: left;
  transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.nav-pill span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-pill:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) var(--md-sys-state-hover-opacity), transparent);
}

.nav-pill.selected {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.nav-pill small {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-small);
}

.nav-pill .md-icon {
  color: var(--md-sys-color-on-surface-variant);
  font-size: 18px;
}

hr {
  width: 100%;
  margin: var(--md-space-2) 0;
  border: 0;
  border-top: 1px solid var(--md-sys-color-outline-variant);
}
</style>
