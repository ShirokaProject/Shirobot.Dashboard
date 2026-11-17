/**
 * Marks <html data-input="pointer|keyboard"> by the last way the user interacted. Text inputs
 * match :focus-visible even when clicked, so CSS cannot tell a clicked select from a tabbed-to
 * one by itself; with this, a full focus ring can be kept for keyboard use only.
 */
export function installInputModality(root: Document = document) {
  const set = (mode: 'pointer' | 'keyboard') => {
    if (root.documentElement.dataset.input !== mode) root.documentElement.dataset.input = mode
  }
  root.addEventListener('pointerdown', () => set('pointer'), true)
  root.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key.startsWith('Arrow')) set('keyboard')
  }, true)
}
