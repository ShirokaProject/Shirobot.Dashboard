import type { Directive } from 'vue'

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * `v-swap="key"`: when the key changes, the element's content settles in instead of
 * teleporting, so a detail pane that now shows something else reads as changed.
 * Enter only and short: the old content is already gone, and this fires on every list click.
 */
export const vSwap: Directive<HTMLElement, unknown> = {
  updated(el, binding) {
    if (binding.value === binding.oldValue) return
    const frames = reduceMotion()
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }]
    for (const child of Array.from(el.children)) {
      child.animate(frames, { duration: 180, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' })
    }
  }
}
