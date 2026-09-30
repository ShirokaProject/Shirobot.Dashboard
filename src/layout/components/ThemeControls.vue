<template>
  <div ref="controlsRoot" class="top-actions">
    <div class="expand-control">
      <button
        type="button"
        class="top-action-icon appearance-action"
        :class="[activeColor, activeMode]"
        aria-label="切换外观"
        @click="toggleAppearancePanel"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 3a9 9 0 0 0 0 18h1.2a1.8 1.8 0 0 0 1.27-3.07 1.2 1.2 0 0 1 .85-2.05H17a4 4 0 0 0 4-4C21 7 17 3 12 3Z" />
          <circle cx="7.5" cy="10" r="1.2" />
          <circle cx="10.5" cy="7.2" r="1.2" />
          <circle cx="14.2" cy="7.6" r="1.2" />
          <circle cx="16.4" cy="10.8" r="1.2" />
        </svg>
      </button>

      <Transition name="expand-panel-fade">
        <div v-if="appearancePanelOpen" class="expand-panel appearance-panel" @mouseleave="restoreAppearance">
          <section v-if="themes.length > 1" class="appearance-section">
            <div class="appearance-section-head">
              <span>主题色</span>
            </div>
            <div class="theme-grid">
              <button
                v-for="theme in themes"
                :key="theme.key"
                type="button"
                class="theme-option"
                :class="[{ active: activeColor === theme.key }, theme.key]"
                @pointerenter="previewColor(theme.key)"
                @focus="previewColor(theme.key)"
                @click="setColor(theme.key)"
              >
                <span class="theme-swatch" aria-hidden="true"></span>
                <span>{{ theme.label }}</span>
              </button>
            </div>
          </section>

          <section class="appearance-section">
            <div class="appearance-section-head">
              <span>明暗模式</span>
            </div>
            <div class="mode-grid">
              <button
                v-for="mode in modes"
                :key="mode.key"
                type="button"
                class="mode-choice"
                :class="[{ active: activeMode === mode.key }, mode.key]"
                @pointerenter="previewMode(mode.key)"
                @focus="previewMode(mode.key)"
                @click="setMode(mode.key)"
              >
                <span class="mode-choice-icon" aria-hidden="true">
                  <svg v-if="mode.key === 'dark'" viewBox="0 0 24 24" focusable="false"><path d="M21 14.2A7.8 7.8 0 0 1 9.8 3a9 9 0 1 0 11.2 11.2Z" /></svg>
                  <svg v-else-if="mode.key === 'light'" viewBox="0 0 24 24" focusable="false"><path d="M12 4V2m0 20v-2M4 12H2m20 0h-2m-2.34-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41" /><circle cx="12" cy="12" r="4" /></svg>
                  <svg v-else viewBox="0 0 24 24" focusable="false"><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8m-4-4v4" /></svg>
                </span>
                <span>{{ mode.label }}</span>
              </button>
            </div>
          </section>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  DEFAULT_COLOR_MODE,
  DEFAULT_COLOR_THEME,
  THEME_STORAGE_KEYS,
  applyColorMode,
  applyColorTheme,
  colorModes,
  colorThemes,
  isColorModeKey,
  isColorThemeKey,
  type ColorModeKey,
  type ColorThemeKey
} from '../../theme'

const themes = colorThemes
const modes = colorModes
const activeColor = ref<ColorThemeKey>(DEFAULT_COLOR_THEME)
const activeMode = ref<ColorModeKey>(DEFAULT_COLOR_MODE)
const appearancePanelOpen = ref(false)
const controlsRoot = ref<HTMLElement | null>(null)

function previewColor(color: ColorThemeKey) {
  applyColorTheme(color)
}

function previewMode(mode: ColorModeKey) {
  applyColorMode(mode)
}

function restoreAppearance() {
  applyColorTheme(activeColor.value)
  applyColorMode(activeMode.value)
}

function setColor(color: ColorThemeKey) {
  activeColor.value = color
  applyColorTheme(color)
  localStorage.setItem(THEME_STORAGE_KEYS.color, color)
}

function setMode(mode: ColorModeKey) {
  activeMode.value = mode
  applyColorMode(mode)
  localStorage.setItem(THEME_STORAGE_KEYS.mode, mode)
}

function closeAppearancePanel() {
  appearancePanelOpen.value = false
  restoreAppearance()
}

function toggleAppearancePanel() {
  appearancePanelOpen.value = !appearancePanelOpen.value
  if (!appearancePanelOpen.value) restoreAppearance()
}

function handleOutsidePointerDown(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (controlsRoot.value?.contains(target)) return

  if (appearancePanelOpen.value) closeAppearancePanel()
}

onMounted(() => {
  const savedColor = localStorage.getItem(THEME_STORAGE_KEYS.color)
  const savedMode = localStorage.getItem(THEME_STORAGE_KEYS.mode)

  if (isColorThemeKey(savedColor)) setColor(savedColor)
  if (isColorModeKey(savedMode)) setMode(savedMode)

  document.addEventListener('pointerdown', handleOutsidePointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown)
})
</script>

<style scoped>
.top-actions {
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
}

.expand-control {
  position: relative;
}

.top-action-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.top-action-icon:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface-variant) var(--md-sys-state-hover-opacity), transparent);
}

.top-action-icon:active {
  background: color-mix(in srgb, var(--md-sys-color-on-surface-variant) var(--md-sys-state-pressed-opacity), transparent);
}

.top-action-icon svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}


.expand-panel {
  position: absolute;
  z-index: 20;
  top: calc(100% + var(--md-space-3));
  right: 0;
  display: flex;
  align-items: stretch;
  gap: var(--md-space-3);
  padding: var(--md-space-3);
  border: 0;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container-high);
  box-shadow: var(--md-sys-elevation-level2);
  transform-origin: top right;
}

.expand-panel-fade-enter-active,
.expand-panel-fade-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease,
    filter 160ms ease;
}

.expand-panel-fade-enter-from,
.expand-panel-fade-leave-to {
  opacity: 0;
  filter: blur(2px);
  transform: translateY(-6px) scale(0.98);
}

.expand-panel-fade-enter-to,
.expand-panel-fade-leave-from {
  opacity: 1;
  filter: blur(0);
  transform: translateY(0) scale(1);
}

.appearance-panel {
  width: min(82vw, 520px);
  flex-direction: column;
  gap: var(--md-space-4);
}

.appearance-section {
  display: grid;
  gap: var(--md-space-3);
  padding: var(--md-space-3);
  border-radius: var(--md-sys-shape-corner-large);
}

.appearance-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 var(--md-space-1);
}

.appearance-section-head span {
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-title-small);
}

.appearance-section-head small {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--md-space-2);
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--md-space-2);
}

.theme-option,
.mode-choice {
  min-width: 0;
  min-height: 64px;
  display: grid;
  align-items: center;
  gap: var(--md-space-2);
  border: 1px solid transparent;
  border-radius: var(--md-sys-shape-corner-large);
  padding: var(--md-space-2) var(--md-space-3);
  background: var(--md-sys-color-surface-container-lowest);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  font: var(--md-sys-typescale-label-large);
  transition: background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
  text-align: left;
}

.theme-option {
  grid-template-columns: 30px minmax(0, 1fr);
}

.mode-choice {
  grid-template-columns: 24px minmax(0, 1fr);
}

.theme-option:hover,
.mode-choice:hover {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) var(--md-sys-state-hover-opacity), var(--md-sys-color-surface-container-lowest));
}

.theme-option.active,
.mode-choice.active {
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
}

.theme-swatch {
  width: 30px;
  height: 30px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary);
}

.theme-option.paper .theme-swatch {
  background: var(--app-swatch-paper);
}

.theme-option.chrome .theme-swatch {
  background: var(--app-swatch-chrome);
}

.mode-choice-icon,
.mode-choice-icon svg {
  width: 20px;
  height: 20px;
}

.mode-choice-icon svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 599px) {
  .appearance-panel {
    width: calc(100vw - 32px);
  }

  .theme-grid,
  .mode-grid {
    grid-template-columns: 1fr;
  }
}
</style>
