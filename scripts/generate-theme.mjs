// Generates src/theme/tokens.css with Material Color Utilities.
// Run `npm run theme` after changing a palette below; never edit tokens.css by hand.
//
// Roles are picked tone by tone from tonal palettes so lightness carries the hierarchy.
// The first theme is the default (no data-color attribute); keep the list in sync with
// src/theme/index.ts.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Hct, TonalPalette, argbFromHex, hexFromArgb } from '@material/material-color-utilities'

const hex = (palette, tone) => hexFromArgb(palette.tone(tone))
const paletteOf = (color, chromaScale = 1) => {
  const hct = Hct.fromInt(argbFromHex(color))
  return TonalPalette.fromHueAndChroma(hct.hue, hct.chroma * chromaScale)
}

// ---------- 纸墨: warm paper, ink primary, one fountain-pen blue accent ----------
// Built from reference paper colors: at chroma ~2 HCT hue drifts, and hand-picked hues
// came out peach/pink. The paper's own hue keeps every tone a clean warm grey.
const paperNeutral = paletteOf('#f7f6f3')
const paperAccent = paletteOf('#2f5d8c')

const paper = {
  key: 'paper',
  primary: paperNeutral,
  // [primary, on-primary, container, on-container] tones, light / dark
  primaryTones: { light: [14, 99, 90, 12], dark: [90, 12, 25, 90] },
  secondary: paletteOf('#faf7f2', 1.5),
  tertiary: paperAccent,
  tertiarySoft: TonalPalette.fromHueAndChroma(Hct.fromInt(argbFromHex('#2f5d8c')).hue, 12),
  neutral: paperNeutral,
  neutralVariant: paletteOf('#faf7f2', 1.5),
  // Print-like status; "healthy" reuses the ink-blue accent so green doesn't look foreign.
  status: [
    { key: 'success', light: '#2f5d8c', dark: '#a6c8f0' },
    { key: 'warning', light: '#a8751f', dark: '#e3c07c' },
    { key: 'error', light: '#b3432f', dark: '#eb9a88' }
  ],
  // Paper on a slightly darker desk: tone separation, no outline or shadow.
  layer: {
    light: { bg: 94.5, card: 99.5, shadow: 'none', shadowHover: 'var(--md-sys-elevation-level1)' },
    dark: { bg: 6, card: 12, shadow: 'none', shadowHover: 'var(--md-sys-elevation-level1)' }
  },
  accent: 'var(--md-sys-color-tertiary)',
  // Switch "on" track: the same fountain-pen blue as links, status dots and the chart, so
  // it belongs to the paper palette instead of standing out as a foreign bright blue
  switchOn: 'var(--md-sys-color-tertiary)',
  // Selected toggle segments: solid ink, the one strong mark on paper
  selected: ['var(--md-sys-color-primary)', 'var(--md-sys-color-on-primary)'],
  // Unselected segments: the quiet warm grey
  toggle: ['var(--md-sys-color-secondary-container)', 'var(--md-sys-color-on-secondary-container)']
}

// ---------- Chrome: white page, cool greys, Google blue, soft elevated cards ----------
const googleBlue = paletteOf('#0b57d0')

const chrome = {
  key: 'chrome',
  primary: googleBlue,
  primaryTones: { light: [40, 100, 90, 10], dark: [80, 20, 30, 90] },
  // Selected nav / chips: the light blue Chrome uses for its active item (#d3e3fd)
  secondary: paletteOf('#d3e3fd'),
  tertiary: googleBlue,
  tertiarySoft: paletteOf('#d3e3fd'),
  neutral: paletteOf('#f0f4f9', 0.6),
  neutralVariant: paletteOf('#f0f4f9', 1.2),
  status: [
    { key: 'success', light: '#1e8e3e', dark: '#81c995' },
    { key: 'warning', light: '#b06000', dark: '#fdd663' },
    { key: 'error', light: '#d93025', dark: '#f28b82' }
  ],
  // White cards on a white page, lifted by M3 level 1 like Chrome's settings cards.
  layer: {
    // Faint blue-grey page, white cards: the first step of Chrome's light-to-deep blue ladder
    // Chrome-style soft lift: a thin key shadow plus a faint ambient glow, in cool grey
    // (Google grey 800, #3c4043) rather than black, which read dirty on white.
    light: {
      bg: 98,
      card: 100,
      shadow: '0 1px 2px 0 color-mix(in srgb, var(--md-sys-color-shadow) 22%, transparent), 0 1px 4px 1px color-mix(in srgb, var(--md-sys-color-shadow) 8%, transparent)',
      shadowHover: '0 1px 3px 0 color-mix(in srgb, var(--md-sys-color-shadow) 26%, transparent), 0 4px 10px 3px color-mix(in srgb, var(--md-sys-color-shadow) 10%, transparent)'
    },
    dark: { bg: 6, card: 12, shadow: 'none', shadowHover: 'var(--md-sys-elevation-level1)' }
  },
  accent: 'var(--md-sys-color-primary)',
  switchOn: 'var(--md-sys-color-primary)',
  // Selected toggle segments: light blue with dark-blue text; solid blue stays for the rare primary button
  shadowColor: '#3c4043',
  selected: ['var(--md-sys-color-secondary-container)', 'var(--md-sys-color-on-secondary-container)'],
  // Unselected segments: neutral grey, so light blue means "selected" and nothing else
  toggle: ['var(--md-sys-color-surface-container-high)', 'var(--md-sys-color-on-surface-variant)']
}

const themes = [paper, chrome]

// [role, palette key, light tone, dark tone]
const roleMap = [
  ['secondary', 'secondary', 40, 80],
  ['on-secondary', 'secondary', 100, 20],
  ['secondary-container', 'secondary', 90, 24],
  ['on-secondary-container', 'secondary', 12, 90],
  ['tertiary', 'tertiary', 40, 80],
  ['on-tertiary', 'tertiary', 100, 20],
  ['tertiary-container', 'tertiarySoft', 92, 28],
  ['on-tertiary-container', 'tertiary', 15, 90],
  ['surface', 'neutral', 98, 8],
  ['on-surface', 'neutral', 12, 92],
  ['surface-variant', 'neutralVariant', 90, 28],
  ['on-surface-variant', 'neutralVariant', 38, 78],
  ['surface-container-lowest', 'neutral', 100, 5],
  ['surface-container-low', 'neutral', 97, 10],
  ['surface-container', 'neutral', 95, 13],
  ['surface-container-high', 'neutral', 93, 17],
  ['surface-container-highest', 'neutral', 90, 22],
  ['surface-dim', 'neutral', 88, 8],
  ['surface-bright', 'neutral', 98, 24],
  ['outline', 'neutralVariant', 55, 58],
  ['outline-variant', 'neutralVariant', 88, 26],
  ['inverse-surface', 'neutral', 20, 90],
  ['inverse-on-surface', 'neutral', 95, 20],
  ['shadow', 'neutral', 0, 0],
  ['scrim', 'neutral', 0, 0]
]

function schemeTokens(theme, isDark) {
  const mode = isDark ? 'dark' : 'light'
  const [p, onP, pc, onPc] = theme.primaryTones[mode]
  const tokens = [
    ['--md-sys-color-primary', hex(theme.primary, p)],
    ['--md-sys-color-on-primary', hex(theme.primary, onP)],
    ['--md-sys-color-primary-container', hex(theme.primary, pc)],
    ['--md-sys-color-on-primary-container', hex(theme.primary, onPc)],
    ['--md-sys-color-inverse-primary', hex(theme.primary, isDark ? p - 50 : p + 40)],
    ...roleMap.map(([role, palette, light, dark]) => [`--md-sys-color-${role}`, hex(theme[palette], isDark ? dark : light)])
  ]

  for (const status of theme.status) {
    const main = argbFromHex(isDark ? status.dark : status.light)
    const hue = Hct.fromInt(argbFromHex(status.light)).hue
    const palette = TonalPalette.fromHueAndChroma(hue, 40)
    const soft = TonalPalette.fromHueAndChroma(hue, 14)
    tokens.push(
      [`--md-sys-color-${status.key}`, hexFromArgb(main)],
      [`--md-sys-color-on-${status.key}`, hex(palette, isDark ? 15 : 100)],
      [`--md-sys-color-${status.key}-container`, hex(soft, isDark ? 26 : 93)],
      [`--md-sys-color-on-${status.key}-container`, hex(palette, isDark ? 88 : 22)]
    )
  }

  // Optional tinted shadow (Chrome uses cool grey, not black); light mode only
  if (theme.shadowColor && !isDark) {
    tokens.find(([name]) => name === '--md-sys-color-shadow')[1] = theme.shadowColor
  }

  const layer = theme.layer[mode]
  tokens.push(
    ['--app-bg', hex(theme.neutral, layer.bg)],
    ['--app-card', hex(theme.neutral, layer.card)],
    ['--app-card-outline', hex(theme.neutralVariant, isDark ? 20 : 91)],
    // Blocks nested inside a card or dialog (field groups, notices, fact lists). Light mode
    // tints them slightly below the white card; dark mode must go *lighter* than the
    // container, or they read as holes punched into it.
    ['--app-inset', hex(theme.neutral, isDark ? 22 : 97)],
    ['--app-card-shadow', layer.shadow],
    ['--app-card-shadow-hover', layer.shadowHover],
    ['--app-accent', theme.accent],
    ['--app-switch-on', typeof theme.switchOn === 'string' ? theme.switchOn : theme.switchOn[isDark ? 'dark' : 'light']],
    ['--app-selected', theme.selected[0]],
    ['--app-on-selected', theme.selected[1]],
    ['--app-toggle', theme.toggle[0]],
    ['--app-on-toggle', theme.toggle[1]],
    ['--app-chart-accent', theme.accent]
  )
  return tokens
}

function block(selector, tokens, indent = '') {
  const body = tokens.map(([name, value]) => `${indent}  ${name}: ${value};`).join('\n')
  return `${indent}${selector} {\n${body}\n${indent}}`
}

const selectorFor = (theme, suffix) => theme === themes[0] ? `:root${suffix}` : `:root${suffix}[data-color='${theme.key}']`

// Theme picker swatches: each theme's light primary, available whichever theme is active.
const swatches = block(':root', themes.map(theme => [
  `--app-swatch-${theme.key}`,
  hex(theme.primary, theme.primaryTones.light[0])
]))

const output = [
  '/* Generated by scripts/generate-theme.mjs. Do not edit; change the palettes and run `npm run theme`. */',
  swatches,
  ...themes.map(theme => block(selectorFor(theme, ''), [['color-scheme', 'light'], ...schemeTokens(theme, false)])),
  ...themes.map(theme => block(selectorFor(theme, "[data-mode='dark']"), [['color-scheme', 'dark'], ...schemeTokens(theme, true)])),
  '/* System mode follows the OS until the user picks light or dark explicitly. */',
  `@media (prefers-color-scheme: dark) {\n${themes.map(theme => block(selectorFor(theme, ":not([data-mode='light'])"), [['color-scheme', 'dark'], ...schemeTokens(theme, true)], '  ')).join('\n\n')}\n}`,
  ''
].join('\n\n')

const target = fileURLToPath(new URL('../src/theme/tokens.css', import.meta.url))
writeFileSync(target, output)
console.log(`wrote ${target}`)
