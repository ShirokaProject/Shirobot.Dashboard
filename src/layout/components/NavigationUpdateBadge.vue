<template>
  <span
    v-if="count"
    class="update-badge"
    :class="{ floating, dot: floating && text }"
    :title="text || `${count} 项可更新`"
    :aria-label="text || `${count} 项可更新`"
  >
    <template v-if="!(floating && text)">{{ text || (count > 99 ? '99+' : count) }}</template>
  </span>
</template>

<script setup lang="ts">
// `text` replaces the number (e.g. 有新版本); in floating spots it collapses to a dot
defineProps<{ count?: number; floating?: boolean; text?: string }>()
</script>

<style scoped>
.update-badge {
  display: inline-flex;
  min-width: 18px;
  height: 18px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  margin-left: auto;
  padding: 0 6px;
  border-radius: var(--md-sys-shape-corner-full);
  background: color-mix(in srgb, var(--md-sys-color-on-surface) var(--md-sys-state-hover-opacity), transparent);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-small);
  font-weight: 400;
  white-space: nowrap;
}

/* Anchored to the icon's top-right inside a 32px-tall indicator, so it never touches the container edge */
.update-badge.floating {
  position: absolute;
  top: 0;
  left: calc(50% + 4px);
  margin: 0;
  pointer-events: none;
}

.update-badge.dot {
  min-width: 8px;
  width: 8px;
  height: 8px;
  padding: 0;
  top: 4px;
  left: calc(50% + 8px);
  background: var(--md-sys-color-on-surface-variant);
}
</style>
