import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Maple Mono', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['Maple Mono', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      borderRadius: {
        md3: 'var(--md-sys-shape-corner-large)',
        'md3-full': 'var(--md-sys-shape-corner-full)'
      },
      colors: {
        md: {
          primary: 'var(--md-sys-color-primary)',
          onPrimary: 'var(--md-sys-color-on-primary)',
          primaryContainer: 'var(--md-sys-color-primary-container)',
          onPrimaryContainer: 'var(--md-sys-color-on-primary-container)',
          surface: 'var(--md-sys-color-surface)',
          onSurface: 'var(--md-sys-color-on-surface)',
          surfaceLow: 'var(--md-sys-color-surface-container-low)',
          surfaceLowest: 'var(--md-sys-color-surface-container-lowest)',
          outlineVariant: 'var(--md-sys-color-outline-variant)'
        }
      },
      spacing: {
        md1: 'var(--md-space-1)',
        md2: 'var(--md-space-2)',
        md3: 'var(--md-space-3)',
        md4: 'var(--md-space-4)',
        md5: 'var(--md-space-5)',
        md6: 'var(--md-space-6)'
      }
    }
  },
  plugins: []
} satisfies Config
