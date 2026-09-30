<template>
  <nav class="config-nav" aria-label="配置分类">
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
    <hr v-if="groups.length && showRoutes" />
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
  </nav>
</template>

<script setup lang="ts">
import MdIcon from '../../../components/MdIcon.vue'
import { ROUTES_VIEW, type ConfigGroup } from '../usePluginConfig'

withDefaults(defineProps<{ groups: ConfigGroup[]; view: string; showRoutes?: boolean }>(), { showRoutes: true })
const emit = defineEmits<{ 'update:view': [view: string] }>()
</script>

<style scoped>
.config-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

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
