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

interface IndicatorState {
  thumb: HTMLElement
  observer: ResizeObserver
  target: HTMLElement | null
  placed: boolean
}

const indicators = new WeakMap<HTMLElement, IndicatorState>()

/** Offset of `target` inside `root`, from layout boxes so a press scale in flight is ignored. */
function offsetWithin(target: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  let node: HTMLElement | null = target
  while (node && node !== root) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return node === root ? { x, y } : null
}

function placeIndicator(el: HTMLElement) {
  const state = indicators.get(el)
  if (!state) return
  const { thumb } = state
  // A re-render may have reordered the children; the thumb always stays first, under them.
  if (el.firstElementChild !== thumb) el.prepend(thumb)

  const target = el.querySelector<HTMLElement>('.selected')
  if (target !== state.target) {
    if (state.target) state.observer.unobserve(state.target)
    if (target) state.observer.observe(target)
    state.target = target
  }
  const offset = target && target.offsetParent ? offsetWithin(target, el) : null
  if (!target || !offset) {
    thumb.style.opacity = '0'
    state.placed = false
    return
  }

  // Appearing from nowhere: land in place, then fade in, rather than fly in from the corner.
  if (!state.placed) thumb.style.transition = 'none'
  thumb.style.transform = `translate(${offset.x}px, ${offset.y}px)`
  thumb.style.width = `${target.offsetWidth}px`
  thumb.style.height = `${target.offsetHeight}px`
  thumb.style.borderRadius = getComputedStyle(target).borderRadius
  if (!state.placed) {
    void thumb.offsetWidth
    thumb.style.transition = ''
    state.placed = true
  }
  thumb.style.opacity = '1'
}

/**
 * `v-indicator`: one shared highlight travels to whichever descendant has `.selected`,
 * instead of each item switching its own background on and off.
 * `v-indicator:toggle` is the segmented-control form: the group becomes the track.
 * Styles live in styles/m3.css (.has-indicator / .sel-indicator).
 */
export const vIndicator: Directive<HTMLElement, unknown, string, 'toggle'> = {
  mounted(el, binding) {
    const thumb = document.createElement('span')
    thumb.className = 'sel-indicator'
    thumb.setAttribute('aria-hidden', 'true')
    el.classList.add('has-indicator')
    if (binding.arg === 'toggle') el.classList.add('is-toggle')
    el.prepend(thumb)
    const observer = new ResizeObserver(() => placeIndicator(el))
    observer.observe(el)
    indicators.set(el, { thumb, observer, target: null, placed: false })
    placeIndicator(el)
  },
  updated(el) {
    placeIndicator(el)
  },
  unmounted(el) {
    const state = indicators.get(el)
    if (!state) return
    state.observer.disconnect()
    state.thumb.remove()
    indicators.delete(el)
  }
}
