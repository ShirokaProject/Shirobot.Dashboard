export const colorThemes = [
  { key: 'rose', label: '玫瑰' },
  { key: 'lavender', label: '薰衣草' },
  { key: 'blue', label: '浅蓝' }
] as const

export const colorModes = [
  { key: 'system', label: '自动' },
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' }
] as const

export type ColorThemeKey = (typeof colorThemes)[number]['key']
export type ColorModeKey = (typeof colorModes)[number]['key']

export const DEFAULT_COLOR_THEME: ColorThemeKey = 'rose'
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
