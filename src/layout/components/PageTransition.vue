<template>
  <Transition
    :name="name"
    @before-leave="startSwap"
    @after-enter="endSwap"
    @enter-cancelled="endSwap"
  >
    <component :is="component" :key="transitionKey" class="page-route-view" />
  </Transition>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

/**
 * page-down / page-up scroll the content the way the sidebar indicator moves: picking an item
 * further down pushes the old page up and out while the new one rises in under it, together,
 * like one strip being scrolled. page-fade crossfades changes the sidebar does not show
 * (a link inside a page, the first page after login).
 */
export type PageTransitionName = 'page-fade' | 'page-down' | 'page-up'

withDefaults(defineProps<{
  component: Component
  transitionKey: string
  name?: PageTransitionName
}>(), {
  name: 'page-fade'
})

// While two pages share the frame, it clips vertically, so the pages slide under its edges
// instead of pushing a scrollbar into view. At rest it clips nothing (shadows, popovers).
let swaps = 0
function startSwap(el: Element) {
  swaps++
  el.parentElement?.classList.add('page-swapping')
}
function endSwap(el: Element) {
  swaps = Math.max(0, swaps - 1)
  if (!swaps) el.parentElement?.classList.remove('page-swapping')
}
</script>

<style scoped>
:global(.page-route-view) {
  display: block;
  width: 100%;
  min-width: 0;
  opacity: 1;
}

:global(.page-swapping) {
  overflow-y: clip;
}

/*
 * Both pages are on screen at once. The leaving one is lifted out of the flow at the spot it
 * occupied, so the arriving one takes its place underneath without a jump.
 * 240ms on the same ease-out as the sidebar indicator, so the two land together. The old page
 * fades faster than it moves, so the overlap never reads as two pages stacked.
 */
:global(.page-fade-leave-active),
:global(.page-down-leave-active),
:global(.page-up-leave-active) {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  transition:
    opacity 140ms var(--app-ease-out),
    transform 240ms var(--app-ease-out);
}

:global(.page-fade-enter-active),
:global(.page-down-enter-active),
:global(.page-up-enter-active) {
  transition:
    opacity 200ms var(--app-ease-out),
    transform 240ms var(--app-ease-out);
}

:global(.page-fade-leave-to),
:global(.page-fade-enter-from),
:global(.page-down-leave-to),
:global(.page-down-enter-from),
:global(.page-up-leave-to),
:global(.page-up-enter-from) {
  opacity: 0;
}

:global(.page-down-leave-to) { transform: translateY(-40px); }
:global(.page-down-enter-from) { transform: translateY(40px); }
:global(.page-up-leave-to) { transform: translateY(40px); }
:global(.page-up-enter-from) { transform: translateY(-40px); }

@media (prefers-reduced-motion: reduce) {
  :global(.page-down-leave-to),
  :global(.page-down-enter-from),
  :global(.page-up-leave-to),
  :global(.page-up-enter-from) {
    transform: none;
  }
}
</style>
