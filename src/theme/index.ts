import { ref } from 'vue'

// Keep in sync with the themes in scripts/generate-theme.mjs (first one is the default).
export const colorThemes = [
  { key: 'paper', label: '纸墨' },
  { key: 'chrome', label: 'Chrome' }
] as const

export const colorModes = [
  { key: 'system', label: '自动' },
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' }
] as const

export type ColorThemeKey = (typeof colorThemes)[number]['key']
export type ColorModeKey = (typeof colorModes)[number]['key']

export const DEFAULT_COLOR_THEME: ColorThemeKey = 'paper'
export const DEFAULT_COLOR_MODE: ColorModeKey = 'system'

export const THEME_STORAGE_KEYS = {
  color: 'shirobot-color',
  mode: 'shirobot-mode'
} as const

export function applyColorTheme(color: ColorThemeKey) {
  if (color === DEFAULT_COLOR_THEME) {
    delete document.documentElement.dataset.color
  } else {
    document.documentElement.dataset.color = color
  }
}

export function applyColorMode(mode: ColorModeKey) {
  if (mode === DEFAULT_COLOR_MODE) {
    delete document.documentElement.dataset.mode
  } else {
    document.documentElement.dataset.mode = mode
  }
}

export function isColorThemeKey(value: string | null): value is ColorThemeKey {
  return colorThemes.some(theme => theme.key === value)
}

export function isColorModeKey(value: string | null): value is ColorModeKey {
  return colorModes.some(mode => mode.key === value)
}

function readSavedMode(): ColorModeKey {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEYS.mode)
    if (isColorModeKey(saved)) return saved
  } catch {
    // storage blocked: fall back to the default
  }
  return DEFAULT_COLOR_MODE
}

/** The committed light/dark choice, shared by every control that can change it. */
export const activeColorMode = ref<ColorModeKey>(readSavedMode())

if (typeof document !== 'undefined') applyColorMode(activeColorMode.value)

export function commitColorMode(mode: ColorModeKey) {
  activeColorMode.value = mode
  applyColorMode(mode)
  try {
    localStorage.setItem(THEME_STORAGE_KEYS.mode, mode)
  } catch {
    // not persisted, still applied for this session
  }
}
