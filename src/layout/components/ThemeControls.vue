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
          <section class="appearance-section">
            <div class="appearance-section-head">
              <span>主题色</span>
              <small>Color</small>
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
              <small>Mode</small>
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
    subtitle: 'Mono family',
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
    subtitle: 'Soft display fonts',
    options: [
      { key: 'lolita', label: 'Lolita', sample: 'Lo', meta: 'Display' },
      { key: 'xiaolai', label: 'Xiaolai', sample: '小', meta: 'Regular' },
      { key: 'xiaolai-mono', label: 'Mono', sample: '码', meta: 'Xiaolai', secondary: true }
    ]
  },
  {
    title: 'Sans SC',
    subtitle: 'Chinese sans-serif',
    options: [
      { key: 'source-han', label: 'Source Han', sample: '思', meta: 'Sans SC' }
    ]
  }
]

const activeColor = ref<ColorThemeKey>(DEFAULT_COLOR_THEME)
const activeMode = ref<ColorModeKey>(DEFAULT_COLOR_MODE)
const activeFont = ref<FontPreviewKey>('maple')
const appearancePanelOpen = ref(false)
const fontPanelOpen = ref(false)
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

  if (isColorThemeKey(savedColor)) setColor(savedColor)
  if (isColorModeKey(savedMode)) setMode(savedMode)
  if (isFontPreviewKey(savedFont)) setFont(savedFont)

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
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 46%, transparent);
  border-radius: var(--md-sys-shape-corner-full);
  background: color-mix(in srgb, var(--md-sys-color-surface-container-lowest) 88%, white 12%);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  box-shadow:
    0 8px 20px color-mix(in srgb, var(--md-sys-color-shadow) 10%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 62%, transparent);
  transition:
    background 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.top-action-icon:hover,
.top-action-icon:focus-visible {
  border-color: color-mix(in srgb, currentColor 24%, var(--md-sys-color-outline-variant));
  box-shadow:
    0 14px 32px color-mix(in srgb, var(--md-sys-color-shadow) 15%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 72%, transparent);
  transform: translateY(-1px);
  outline: 0;
}

.top-action-icon:active {
  transform: translateY(0) scale(0.98);
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

.font-action,
.appearance-action {
  color: var(--md-sys-color-primary);
  background: color-mix(in srgb, var(--md-sys-color-primary-container) 72%, var(--md-sys-color-surface-container-lowest));
}

.appearance-action.rose {
  color: #94425f;
  background: color-mix(in srgb, #ffd9e5 88%, white 12%);
}

.appearance-action.lavender {
  color: #6750a4;
  background: color-mix(in srgb, #eaddff 88%, white 12%);
}

.appearance-action.blue {
  color: #365f91;
  background: color-mix(in srgb, #d3e4ff 88%, white 12%);
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
  border: 1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 54%, transparent);
  border-radius: var(--md-sys-shape-corner-large);
  background: color-mix(in srgb, var(--md-sys-color-surface-container-lowest) 94%, white 6%);
  box-shadow:
    0 18px 48px color-mix(in srgb, var(--md-sys-color-shadow) 18%, transparent),
    0 8px 18px color-mix(in srgb, var(--md-sys-color-shadow) 12%, transparent),
    inset 0 1px 0 color-mix(in srgb, white 70%, transparent);
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
