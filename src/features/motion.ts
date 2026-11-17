import type { Directive } from 'vue'

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'

// A search can add or drop dozens of rows in one go; past a handful, moving them all is noise.
const BURST_LIMIT = 12
let burst = 0
function inBurst() {
  if (burst === 0) requestAnimationFrame(() => { burst = 0 })
  return ++burst > BURST_LIMIT
}

function collapse(el: Element, done: () => void, entering: boolean) {
  const node = el as HTMLElement
  if (inBurst()) return done()
  // The parent's gap would stay behind a row squeezed to nothing, so the row gives it back too.
  const gap = node.parentElement ? parseFloat(getComputedStyle(node.parentElement).rowGap) || 0 : 0
  const closed = { height: '0px', marginBottom: `${-gap}px`, opacity: 0 }
  const open = { height: `${node.offsetHeight}px`, marginBottom: '0px', opacity: 1 }
  const frames = reduceMotion()
    ? (entering ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }])
    : (entering ? [closed, open] : [open, closed])
  node.style.overflow = 'hidden'
  const animation = node.animate(frames, { duration: entering ? 220 : 180, easing: EASE_OUT })
  const finish = () => {
    node.style.overflow = ''
    done()
  }
  animation.onfinish = finish
  animation.oncancel = finish
}

/**
 * Hooks for `<Transition>` / `<TransitionGroup :css="false">`: a row opens its own height as
 * it arrives and closes it as it leaves, so what sits below slides instead of jumping.
 * Height is animated on purpose: nothing else moves the following content with it.
 */
export const rowEnter = (el: Element, done: () => void) => collapse(el, done, true)
export const rowLeave = (el: Element, done: () => void) => collapse(el, done, false)

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
      child.animate(frames, { duration: 180, easing: EASE_OUT })
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
  // The container itself may keep its size while its sections grow or shrink (a scrolling
  // pane, rows collapsing above the selection), so every section is watched as well.
  for (const child of Array.from(el.children)) {
    if (child !== thumb) state.observer.observe(child)
  }

  const target = el.querySelector<HTMLElement>('.selected')
  // Travel only when the selection itself changed. When the same item merely shifts (rows
  // above it opening or closing, a resize) the highlight stays glued to it.
  const travel = state.placed && target !== state.target
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
  if (!travel) thumb.style.transition = 'none'
  thumb.style.transform = `translate(${offset.x}px, ${offset.y}px)`
  thumb.style.width = `${target.offsetWidth}px`
  thumb.style.height = `${target.offsetHeight}px`
  thumb.style.borderRadius = getComputedStyle(target).borderRadius
  if (!travel) {
    void thumb.offsetWidth
    thumb.style.transition = ''
  }
  state.placed = true
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
