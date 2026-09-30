<template>
  <nav class="rail" :aria-label="`${noun}源`">
    <h3>{{ noun }}目录</h3>
    <ul class="rail-list">
      <li v-for="source in sources" :key="source.id">
        <button
          type="button"
          class="rail-item"
          :class="{ selected: view === 'catalog' && source.id === activeSourceId }"
          :aria-current="view === 'catalog' && source.id === activeSourceId ? 'true' : undefined"
          @click="emit('selectCatalog', source.id)"
        >
          <MdIcon :name="source.builtIn ? 'verified' : 'folder'" class="rail-icon" />
          <span class="rail-text">
            <strong>{{ source.name }}</strong>
            <small>{{ source.builtIn ? '官方收录' : source.url }}</small>
          </span>
        </button>
        <button
          v-if="!source.builtIn"
          type="button"
          class="rail-remove"
          :aria-label="`移除 ${source.name}`"
          title="移除"
          @click="emit('removeCatalog', source.id)"
        >
          <MdIcon name="close" />
        </button>
      </li>
    </ul>
    <button type="button" class="rail-add" @click="emit('add', 'catalog')">
      <MdIcon name="add" />添加目录
    </button>

    <h3>直接添加</h3>
    <ul class="rail-list">
      <li>
        <button
          type="button"
          class="rail-item"
          :class="{ selected: view === 'direct' }"
          :aria-current="view === 'direct' ? 'true' : undefined"
          @click="emit('selectDirect')"
        >
          <MdIcon name="code" class="rail-icon" />
          <span class="rail-text">
            <strong>单个{{ noun }}仓库</strong>
            <small>GitHub · Gitea · 自建</small>
          </span>
          <span class="rail-count">{{ directCount }}</span>
        </button>
      </li>
    </ul>
    <button type="button" class="rail-add" @click="emit('add', 'repo')">
      <MdIcon name="add" />添加仓库
    </button>
  </nav>
</template>

<script setup lang="ts">
import MdIcon from '../../../components/MdIcon.vue'
import type { CatalogSource, SourceType } from '../../../features/plugins/catalogSources'

withDefaults(defineProps<{
  sources: CatalogSource[]
  activeSourceId: string
  view: 'catalog' | 'direct'
  directCount: number
  /** What the sources hold: 插件 or Adapter */
  noun?: string
}>(), { noun: '插件' })

const emit = defineEmits<{
  selectCatalog: [id: string]
  selectDirect: []
  removeCatalog: [id: string]
  add: [type: SourceType]
}>()
</script>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
}

h3 {
  margin: var(--md-space-2) var(--md-space-3) var(--md-space-2);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium);
}

h3 ~ h3 {
  margin-top: var(--md-space-6);
}

.rail-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rail-list li {
  position: relative;
  display: flex;
}

.rail-item {
  min-width: 0;
  min-height: 52px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
  padding: var(--md-space-2) var(--md-space-3);
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: var(--md-sys-color-on-surface);
  cursor: pointer;
  text-align: left;
  transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.rail-item:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) var(--md-sys-state-hover-opacity), transparent);
}

/* Same active indicator as the app's navigation drawer */
.rail-item.selected {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.rail-list li:has(.rail-remove) .rail-item {
  padding-right: var(--md-space-10);
}

.rail-icon {
  flex: 0 0 auto;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 20px;
}

.rail-item.selected .rail-icon {
  color: inherit;
}

.rail-text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.rail-text strong {
  overflow: hidden;
  font: var(--md-sys-typescale-label-large);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail-text small {
  overflow: hidden;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail-count {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium);
}

.rail-remove {
  position: absolute;
  top: 50%;
  right: var(--md-space-2);
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  opacity: 0;
  transform: translateY(-50%);
  transition: opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.rail-list li:hover .rail-remove,
.rail-remove:focus-visible {
  opacity: 1;
}

.rail-remove:hover {
  background: color-mix(in srgb, var(--md-sys-color-error) var(--md-sys-state-hover-opacity), transparent);
  color: var(--md-sys-color-error);
}

.rail-add {
  height: 40px;
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
  margin-top: 2px;
  padding: 0 var(--md-space-3);
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: var(--app-accent);
  cursor: pointer;
  font: var(--md-sys-typescale-label-large);
}

.rail-add .md-icon {
  font-size: 20px;
}

.rail-add:hover {
  background: color-mix(in srgb, var(--app-accent) var(--md-sys-state-hover-opacity), transparent);
}
</style>
