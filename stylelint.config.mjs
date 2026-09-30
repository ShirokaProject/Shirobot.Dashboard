// Color discipline: pages consume M3 roles from src/theme/tokens.css, nothing else.
// - no hex / rgb / hsl / named colors
// - color-mix() may only use the state-layer opacity tokens, never a literal percentage
export default {
  overrides: [
    { files: ['**/*.vue'], customSyntax: 'postcss-html' }
  ],
  rules: {
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla'],
    'declaration-property-value-disallowed-list': {
      '/.*/': ['/color-mix\\([^;]*?\\d+(\\.\\d+)?%/']
    }
  },
  ignoreFiles: [
    // Token definitions: the only place raw colors and fixed mixes may live.
    'src/theme/tokens.css',
    'src/style.css',
    // Legacy pages not yet migrated. Remove an entry once its page passes `npm run lint:css`.
    'src/views/plugin/components/PluginDetailPane.css',
    'src/views/plugin/components/PluginList.css',
    'src/views/plugin/components/PluginStatusSegmented.css',
    'src/views/plugin/components/PluginToolbar.css',
    'src/views/plugin/components/PluginUploadDialog.css'
  ]
}
