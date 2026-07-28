<template>
  <div ref="controlsRoot" class="top-actions">
    <div class="expand-control">
      <button
        type="button"
        class="top-action-icon font-action"
        :class="activeFont"
        aria-label="切换字体"
        @click="toggleFontPanel"
      >
        <span class="font-action-label">Aa</span>
      </button>
      <Transition name="expand-panel-fade">
        <div
          v-if="fontPanelOpen"
          class="expand-panel font-panel"
          @mouseleave="restoreActiveFont"
        >
          <section v-for="group in fontGroups" :key="group.title" class="font-group">
            <div class="font-group-header">
              <span>{{ group.title }}</span>
              <small>{{ group.subtitle }}</small>
            </div>
            <div class="font-choice-row">
              <button
                v-for="font in group.options"
                :key="font.key"
                type="button"
                class="font-choice"
                :class="[{ active: activeFont === font.key, secondary: font.secondary }, font.key]"
                @pointerenter="previewFont(font.key)"
                @focus="previewFont(font.key)"
                @click="setFont(font.key)"
              >
                <span class="font-choice-sample">{{ font.sample }}</span>
                <span class="font-choice-main">
                  <strong>{{ font.label }}</strong>
                  <small v-if="font.meta">{{ font.meta }}</small>
                </span>
              </button>
            </div>
          </section>
        </div>
      </Transition>
    </div>

    <div class="expand-control">
      <button
        type="button"
        class="top-action-icon appearance-action"
        :class="[activeColor, activeMode]"
        aria-label="切换外观"
        @click="toggleAppearancePanel"
      >
        <svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false" class="palette-symbol">
          <path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 32.5-156t88-127Q256-817 330-848.5T488-880q80 0 151 27.5t124.5 76q53.5 48.5 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80Zm0-400Zm-220 40q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120-160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm200 0q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120 160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17ZM480-160q9 0 14.5-5t5.5-13q0-14-15-33t-15-57q0-42 29-67t71-25h70q66 0 113-38.5T800-518q0-121-92.5-201.5T488-800q-136 0-232 93t-96 227q0 133 93.5 226.5T480-160Z" />
        </svg>
      </button>

      <Transition name="expand-panel-fade">
        <div v-if="appearancePanelOpen" class="expand-panel appearance-panel" @mouseleave="restoreAppearance">
          <section class="appearance-section">
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
                <span
                  v-if="theme.key === 'custom'"
                  class="theme-swatch custom"
                  :style="{ background: customSeed }"
                  aria-hidden="true"
                ></span>
                <span v-else class="theme-swatch" aria-hidden="true"></span>
                <span>{{ theme.label }}</span>
              </button>
            </div>

            <label v-if="activeColor === 'custom'" class="seed-picker">
              <span>种子颜色</span>
              <input
                type="color"
                :value="customSeed"
                aria-label="自定义种子颜色"
                @input="onSeedInput(($event.target as HTMLInputElement).value)"
              />
              <code>{{ customSeed }}</code>
            </label>
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
                  <MaterialSymbol v-if="mode.key === 'dark'" name="dark" />
                  <MaterialSymbol v-else-if="mode.key === 'light'" name="light" />
                  <MaterialSymbol v-else name="system" />
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
import MaterialSymbol from '../../components/MaterialSymbol.vue'
import {
  DEFAULT_COLOR_MODE,
  DEFAULT_COLOR_THEME,
  THEME_STORAGE_KEYS,
  applyColorMode,
  applyColorTheme,
  colorModes,
  colorThemes,
  getStoredSeed,
  isColorModeKey,
  isColorThemeKey,
  type ColorModeKey,
  type ColorThemeKey
} from '../../theme'

type FontPreviewKey = 'maple' | 'maple-regular' | 'maple-medium' | 'maple-semibold' | 'maple-bold' | 'lolita' | 'xiaolai' | 'xiaolai-mono' | 'source-han'

const FONT_STORAGE_KEY = 'shirobot.dashboard.font'

const themes = colorThemes
const modes = colorModes
const fontGroups: Array<{
  title: string
  subtitle: string
  options: Array<{ key: FontPreviewKey; label: string; sample: string; meta?: string; secondary?: boolean }>
}> = [
  {
    title: 'Maple Mono',
    subtitle: '',
    options: [
      { key: 'maple', label: 'Auto', sample: 'Aa', meta: '默认字重' },
      { key: 'maple-regular', label: 'Regular', sample: 'Aa', meta: '400', secondary: true },
      { key: 'maple-medium', label: 'Medium', sample: 'Aa', meta: '500', secondary: true },
      { key: 'maple-semibold', label: 'SemiBold', sample: 'Aa', meta: '600', secondary: true },
      { key: 'maple-bold', label: 'Bold', sample: 'Aa', meta: '700', secondary: true }
    ]
  },
  {
    title: 'Handwriting',
    subtitle: '',
    options: [
      { key: 'lolita', label: 'Lolita', sample: 'Lo', meta: 'Display' },
      { key: 'xiaolai', label: 'Xiaolai', sample: '小', meta: 'Regular' },
      { key: 'xiaolai-mono', label: 'Mono', sample: '码', meta: 'Xiaolai', secondary: true }
    ]
  },
  {
    title: 'Sans SC',
    subtitle: '',
    options: [
      { key: 'source-han', label: 'Source Han', sample: '思', meta: 'Sans SC' }
    ]
  }
]

const activeColor = ref<ColorThemeKey>(DEFAULT_COLOR_THEME)
const activeMode = ref<ColorModeKey>(DEFAULT_COLOR_MODE)
const activeFont = ref<FontPreviewKey>('maple')
const customSeed = ref(getStoredSeed())
const appearancePanelOpen = ref(false)
const fontPanelOpen = ref(false)
const controlsRoot = ref<HTMLElement | null>(null)
let seedDebounce: ReturnType<typeof setTimeout> | null = null

function onSeedInput(value: string) {
  customSeed.value = value
  // Scheme generation is cheap but color inputs fire rapidly while dragging
  if (seedDebounce) clearTimeout(seedDebounce)
  seedDebounce = setTimeout(() => {
    localStorage.setItem(THEME_STORAGE_KEYS.seed, value)
    applyColorTheme('custom', value)
  }, 60)
}

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

function isFontPreviewKey(value: string | null): value is FontPreviewKey {
  return value === 'maple'
    || value === 'maple-regular'
    || value === 'maple-medium'
    || value === 'maple-semibold'
    || value === 'maple-bold'
    || value === 'lolita'
    || value === 'xiaolai'
    || value === 'xiaolai-mono'
    || value === 'source-han'
}

function applyFont(font: FontPreviewKey) {
  if (font === 'maple') {
    delete document.documentElement.dataset.font
  } else {
    document.documentElement.dataset.font = font
  }
}

function previewFont(font: FontPreviewKey) {
  applyFont(font)
}

function restoreActiveFont() {
  applyFont(activeFont.value)
}

function setFont(font: FontPreviewKey) {
  activeFont.value = font
  applyFont(font)
  localStorage.setItem(FONT_STORAGE_KEY, font)
  fontPanelOpen.value = false
}

function closeFontPanel() {
  fontPanelOpen.value = false
  restoreActiveFont()
}

function closeAppearancePanel() {
  appearancePanelOpen.value = false
  restoreAppearance()
}

function toggleAppearancePanel() {
  appearancePanelOpen.value = !appearancePanelOpen.value
  if (appearancePanelOpen.value) {
    closeFontPanel()
  } else {
    restoreAppearance()
  }
}

function toggleFontPanel() {
  fontPanelOpen.value = !fontPanelOpen.value
  if (fontPanelOpen.value) {
    closeAppearancePanel()
  } else {
    restoreActiveFont()
  }
}

function handleOutsidePointerDown(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (controlsRoot.value?.contains(target)) return

  if (appearancePanelOpen.value) closeAppearancePanel()
  if (fontPanelOpen.value) closeFontPanel()
}

onMounted(() => {
  const savedColor = localStorage.getItem(THEME_STORAGE_KEYS.color)
  const savedMode = localStorage.getItem(THEME_STORAGE_KEYS.mode)
  const savedFont = localStorage.getItem(FONT_STORAGE_KEY)

  // Always apply the dynamic scheme on startup (replaces static CSS palettes)
  applyColorTheme(isColorThemeKey(savedColor) ? savedColor : DEFAULT_COLOR_THEME)
  if (isColorThemeKey(savedColor)) activeColor.value = savedColor
  if (isColorModeKey(savedMode)) setMode(savedMode)
  if (isFontPreviewKey(savedFont)) setFont(savedFont)

  document.addEventListener('pointerdown', handleOutsidePointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown)
  if (seedDebounce) clearTimeout(seedDebounce)
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

/* Standard M3 icon button: no outline, state layer feedback only */
.top-action-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-lowest);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition:
    background var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard),
    color var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.top-action-icon:hover,
.top-action-icon:focus-visible {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 8%, var(--md-sys-color-surface-container-lowest));
}

.top-action-icon:active {
  background: color-mix(in srgb, var(--md-sys-color-on-surface) 10%, var(--md-sys-color-surface-container-lowest));
}

.top-action-icon svg {
  width: 21px;
  height: 21px;
  fill: currentColor;
}

.font-action,
.appearance-action {
  color: var(--md-sys-color-on-primary-container);
  background: var(--md-sys-color-primary-container);
}

.font-action:hover,
.font-action:focus-visible,
.appearance-action:hover,
.appearance-action:focus-visible {
  background: color-mix(in srgb, var(--md-sys-color-on-primary-container) 8%, var(--md-sys-color-primary-container));
}

.font-action:active,
.appearance-action:active {
  background: color-mix(in srgb, var(--md-sys-color-on-primary-container) 10%, var(--md-sys-color-primary-container));
}

.font-action-label {
  font: 700 15px / 1 var(--md-ref-typeface-plain);
  letter-spacing: -0.03em;
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
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container);
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
  background: color-mix(in srgb, var(--md-sys-color-surface-container-low) 64%, transparent);
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

.theme-grid,
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
  text-align: left;
}

.theme-option {
  grid-template-columns: 30px minmax(0, 1fr);
}

.mode-choice {
  grid-template-columns: 24px minmax(0, 1fr);
}

.theme-option:hover,
.theme-option.active,
.mode-choice:hover,
.mode-choice.active {
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}

.theme-swatch {
  width: 30px;
  height: 30px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary-container);
  box-shadow: inset 0 0 0 2px color-mix(in srgb, currentColor 18%, transparent);
}

.theme-option.rose .theme-swatch {
  background: #ffd9e5;
}

.theme-option.lavender .theme-swatch {
  background: #eaddff;
}

.theme-option.blue .theme-swatch {
  background: #d3e4ff;
}

.theme-swatch.custom {
  background: conic-gradient(#f66 0deg, #fc6 90deg, #6c6 180deg, #66f 270deg, #f66 360deg);
}

/* Seed color picker for the custom theme */
.seed-picker {
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
  margin-top: var(--md-space-2);
  padding: var(--md-space-2) var(--md-space-3);
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container-lowest);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium);
  cursor: pointer;
}

.seed-picker input[type='color'] {
  width: 40px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--md-sys-shape-corner-small);
  background: transparent;
  cursor: pointer;
}

.seed-picker code {
  font-family: var(--font-mono);
  color: var(--md-sys-color-on-surface);
}

.mode-choice-icon,
.mode-choice-icon svg {
  width: 20px;
  height: 20px;
}

.mode-choice-icon svg {
  font-size: 20px;
}

.font-panel {
  width: min(82vw, 760px);
  max-height: min(72vh, 520px);
  flex-direction: column;
  gap: var(--md-space-3);
  overflow-y: auto;
}

.font-group {
  display: grid;
  gap: var(--md-space-2);
  padding: var(--md-space-2);
  border-radius: var(--md-sys-shape-corner-large);
  background: color-mix(in srgb, var(--md-sys-color-surface-container-low) 64%, transparent);
}

.font-group-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--md-space-3);
  padding: 0 var(--md-space-1);
}

.font-group-header span {
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-title-small);
}

.font-group-header small {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.font-choice-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: var(--md-space-2);
}

.font-choice {
  min-width: 0;
  min-height: 72px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: var(--md-space-3);
  border: 1px solid transparent;
  border-radius: var(--md-sys-shape-corner-large);
  padding: var(--md-space-2) var(--md-space-3);
  background: var(--md-sys-color-surface-container-lowest);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  text-align: left;
  transition:
    background var(--md-sys-motion-duration-short4),
    border-color var(--md-sys-motion-duration-short4),
    color var(--md-sys-motion-duration-short4),
    transform var(--md-sys-motion-duration-short4);
}

.font-choice.secondary {
  min-height: 64px;
  background: color-mix(in srgb, var(--md-sys-color-surface-container-lowest) 72%, transparent);
}

.font-choice:hover,
.font-choice:focus-visible,
.font-choice.active {
  border-color: transparent;
  background: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  transform: translateY(-1px);
  outline: 0;
}

.font-choice-sample {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: var(--md-sys-shape-corner-medium);
  background: color-mix(in srgb, currentColor 10%, transparent);
  color: currentColor;
  font-size: 20px;
  line-height: 1;
}

.font-choice-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.font-choice-main strong,
.font-choice-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.font-choice-main strong {
  color: currentColor;
  font: var(--md-sys-typescale-label-large);
}

.font-choice-main small {
  opacity: 0.72;
  font: var(--md-sys-typescale-body-small);
}

.font-choice.maple .font-choice-sample {
  font-family: 'MapleMono', monospace;
}

.font-choice.maple-regular .font-choice-sample {
  font-family: 'MapleMonoRegular', monospace;
  font-weight: 400;
}

.font-choice.maple-medium .font-choice-sample {
  font-family: 'MapleMonoMedium', monospace;
  font-weight: 500;
}

.font-choice.maple-semibold .font-choice-sample {
  font-family: 'MapleMonoSemiBold', monospace;
  font-weight: 600;
}

.font-choice.maple-bold .font-choice-sample {
  font-family: 'MapleMonoBold', monospace;
  font-weight: 700;
}

.font-choice.lolita .font-choice-sample {
  font-family: 'Lolita', sans-serif;
}

.font-choice.xiaolai .font-choice-sample {
  font-family: 'Xiaolai', sans-serif;
}

.font-choice.xiaolai-mono .font-choice-sample {
  font-family: 'XiaolaiMono', monospace;
}

.font-choice.source-han .font-choice-sample {
  font-family: 'SourceHanSansSC', sans-serif;
}

@media (max-width: 599px) {
  .appearance-panel,
  .font-panel {
    width: calc(100vw - 32px);
  }

  .theme-grid,
  .mode-grid {
    grid-template-columns: 1fr;
  }
}
</style>
