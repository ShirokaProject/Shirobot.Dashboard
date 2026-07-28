import {
  argbFromHex,
  hexFromArgb,
  Hct,
  MaterialDynamicColors,
  SchemeVibrant,
  type DynamicScheme
} from '@material/material-color-utilities'

/*
 * Dynamic Material 3 color: schemes are generated at runtime from a seed
 * color with Google's official material-color-utilities. SchemeVibrant is
 * used (instead of default TonalSpot) because its neutrals carry a clear
 * tint of the seed — matching this app's pastel design language.
 * The static styles/themes/*.css files remain only as a pre-JS fallback.
 */

export const colorThemes = [
  { key: 'rose', label: '玫瑰', seed: '#94425f' },
  { key: 'lavender', label: '薰衣草', seed: '#6750a4' },
  { key: 'blue', label: '浅蓝', seed: '#365f91' },
  { key: 'custom', label: '自定义', seed: '#94425f' }
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
export const DEFAULT_CUSTOM_SEED = '#94425f'

export const THEME_STORAGE_KEYS = {
  color: 'shirobot-color',
  mode: 'shirobot-mode',
  seed: 'shirobot-seed'
} as const

/* CSS variable name -> official dynamic color role */
const ROLE_TABLE = [
  ['primary', MaterialDynamicColors.primary],
  ['on-primary', MaterialDynamicColors.onPrimary],
  ['primary-container', MaterialDynamicColors.primaryContainer],
  ['on-primary-container', MaterialDynamicColors.onPrimaryContainer],
  ['secondary', MaterialDynamicColors.secondary],
  ['on-secondary', MaterialDynamicColors.onSecondary],
  ['secondary-container', MaterialDynamicColors.secondaryContainer],
  ['on-secondary-container', MaterialDynamicColors.onSecondaryContainer],
  ['tertiary', MaterialDynamicColors.tertiary],
  ['on-tertiary', MaterialDynamicColors.onTertiary],
  ['tertiary-container', MaterialDynamicColors.tertiaryContainer],
  ['on-tertiary-container', MaterialDynamicColors.onTertiaryContainer],
  ['error', MaterialDynamicColors.error],
  ['on-error', MaterialDynamicColors.onError],
  ['error-container', MaterialDynamicColors.errorContainer],
  ['on-error-container', MaterialDynamicColors.onErrorContainer],
  ['surface', MaterialDynamicColors.surface],
  ['on-surface', MaterialDynamicColors.onSurface],
  ['surface-variant', MaterialDynamicColors.surfaceVariant],
  ['on-surface-variant', MaterialDynamicColors.onSurfaceVariant],
  ['surface-container-lowest', MaterialDynamicColors.surfaceContainerLowest],
  ['surface-container-low', MaterialDynamicColors.surfaceContainerLow],
  ['surface-container', MaterialDynamicColors.surfaceContainer],
  ['surface-container-high', MaterialDynamicColors.surfaceContainerHigh],
  ['surface-container-highest', MaterialDynamicColors.surfaceContainerHighest],
  ['surface-dim', MaterialDynamicColors.surfaceDim],
  ['surface-bright', MaterialDynamicColors.surfaceBright],
  ['outline', MaterialDynamicColors.outline],
  ['outline-variant', MaterialDynamicColors.outlineVariant],
  ['inverse-surface', MaterialDynamicColors.inverseSurface],
  ['inverse-on-surface', MaterialDynamicColors.inverseOnSurface],
  ['inverse-primary', MaterialDynamicColors.inversePrimary],
  ['shadow', MaterialDynamicColors.shadow],
  ['scrim', MaterialDynamicColors.scrim],
  ['surface-tint', MaterialDynamicColors.surfaceTint]
] as const

function schemeToDeclarations(scheme: DynamicScheme): string {
  return ROLE_TABLE
    .map(([name, role]) => `--md-sys-color-${name}:${hexFromArgb(role.getArgb(scheme))};`)
    .join('')
}

const STYLE_ELEMENT_ID = 'm3-dynamic-theme'

/** Generate light + dark schemes from a seed and inject them as CSS variables. */
export function applyDynamicTheme(seedHex: string) {
  let source: Hct
  try {
    source = Hct.fromInt(argbFromHex(seedHex))
  } catch {
    source = Hct.fromInt(argbFromHex(DEFAULT_CUSTOM_SEED))
  }

  const light = schemeToDeclarations(new SchemeVibrant(source, false, 0))
  const dark = schemeToDeclarations(new SchemeVibrant(source, true, 0))

  const css = [
    `:root{${light}}`,
    `:root[data-mode='dark']{${dark}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-mode='light']):not([data-mode='dark']){${dark}}}`
  ].join('\n')

  let element = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
  if (!element) {
    element = document.createElement('style')
    element.id = STYLE_ELEMENT_ID
    document.head.appendChild(element)
  }
  element.textContent = css
}

export function getStoredSeed(): string {
  return localStorage.getItem(THEME_STORAGE_KEYS.seed) || DEFAULT_CUSTOM_SEED
}

export function seedForTheme(color: ColorThemeKey): string {
  if (color === 'custom') return getStoredSeed()
  return colorThemes.find(theme => theme.key === color)?.seed ?? DEFAULT_CUSTOM_SEED
}

export function applyColorTheme(color: ColorThemeKey, seedOverride?: string) {
  if (color === DEFAULT_COLOR_THEME) {
    delete document.documentElement.dataset.color
  } else {
    document.documentElement.dataset.color = color
  }
  applyDynamicTheme(seedOverride ?? seedForTheme(color))
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
