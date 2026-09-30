<template>
  <!-- Expanded: three-state pill. Collapsed: the pill shrinks to the active icon, which cycles the states. -->
  <div class="mode-switch" :class="{ collapsed }" role="radiogroup" aria-label="明暗模式">
    <button
      v-for="mode in modes"
      :key="mode.key"
      type="button"
      role="radio"
      class="mode-option"
      :class="{ active: activeColorMode === mode.key }"
      :aria-checked="activeColorMode === mode.key"
      :aria-label="collapsed ? `明暗模式：${mode.label}，点击切换` : mode.label"
      :title="collapsed ? `明暗模式：${mode.label}，点击切换` : mode.label"
      :tabindex="collapsed && activeColorMode !== mode.key ? -1 : undefined"
      @click="choose(mode.key)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <template v-if="mode.key === 'light'"><path d="M12 4V2m0 20v-2M4 12H2m20 0h-2m-2.34-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41" /><circle cx="12" cy="12" r="4" /></template>
        <path v-else-if="mode.key === 'dark'" d="M21 14.2A7.8 7.8 0 0 1 9.8 3a9 9 0 1 0 11.2 11.2Z" />
        <template v-else><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8m-4-4v4" /></template>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { activeColorMode, colorModes, commitColorMode, type ColorModeKey } from '../../theme'

const props = defineProps<{ collapsed: boolean }>()

// Light, dark, then follow-the-system, matching the reference pill
const modes = [colorModes[1], colorModes[2], colorModes[0]]

function choose(key: ColorModeKey) {
  if (!props.collapsed) {
    commitColorMode(key)
    return
  }
  const index = modes.findIndex(mode => mode.key === activeColorMode.value)
  commitColorMode(modes[(index + 1) % modes.length].key)
}
</script>

<style scoped>
.mode-switch {
  --switch-duration: var(--drawer-motion-duration, 0.24s);
  --switch-easing: var(--drawer-motion-easing, cubic-bezier(0.4, 0, 0.2, 1));

  width: fit-content;
  display: inline-flex;
  padding: 4px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-high);
  transition:
    margin-left var(--switch-duration) var(--switch-easing),
    background var(--switch-duration) var(--switch-easing);
}

.mode-option {
  width: 40px;
  height: 36px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition:
    width var(--switch-duration) var(--switch-easing),
    opacity 140ms ease,
    background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    box-shadow var(--switch-duration) var(--switch-easing);
}

.mode-option + .mode-option {
  margin-left: 2px;
  transition:
    width var(--switch-duration) var(--switch-easing),
    margin-left var(--switch-duration) var(--switch-easing),
    opacity 140ms ease,
    background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    box-shadow var(--switch-duration) var(--switch-easing);
}

.mode-option:hover:not(.active) {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) var(--md-sys-state-hover-opacity), transparent);
}

.mode-option.active {
  background: var(--md-sys-color-surface-container-lowest);
  color: var(--md-sys-color-on-surface);
  box-shadow: var(--md-sys-elevation-soft);
}

.mode-option:focus-visible {
  outline: 2px solid var(--md-sys-color-primary);
  outline-offset: 2px;
}

/* Collapsed: only the active icon stays, the rest fold away, the pill fades to a plain icon button */
.mode-switch.collapsed {
  margin-left: 0;
  background: transparent;
}

.mode-switch.collapsed .mode-option {
  width: 40px;
  height: 40px;
}

.mode-switch.collapsed .mode-option:not(.active) {
  width: 0;
  margin-left: 0;
  opacity: 0;
  pointer-events: none;
}

.mode-switch.collapsed .mode-option.active {
  background: transparent;
  box-shadow: none;
}

.mode-switch.collapsed .mode-option.active:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) var(--md-sys-state-hover-opacity), transparent);
}

svg {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
