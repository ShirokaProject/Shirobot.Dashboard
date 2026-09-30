<template>
  <Transition :name="name" mode="out-in">
    <component :is="component" :key="transitionKey" class="page-route-view" />
  </Transition>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

export type PageTransitionName = 'md3-fade-through' | 'md3-axis-forward' | 'md3-axis-back'

withDefaults(defineProps<{
  component: Component
  transitionKey: string
  name?: PageTransitionName
}>(), {
  name: 'md3-fade-through'
})
</script>

<style scoped>
:global(.page-route-view) {
  display: block;
  width: 100%;
  min-width: 0;
  opacity: 1;
}

/*
 * Page changes are quick and one-directional in time: the old page leaves fast (accelerate),
 * then the new one settles in (decelerate). With out-in the two never overlap, so nothing
 * fights for the same space. Transforms are only present while animating; at rest the page
 * has no transform, so text is never left on a resampled layer.
 */

/* Top-level destinations (sidebar): fade through with a small rise */
:global(.md3-fade-through-leave-active) {
  transition: opacity 70ms var(--md-sys-motion-easing-emphasized-accelerate);
}

:global(.md3-fade-through-enter-active) {
  transition:
    opacity 160ms var(--md-sys-motion-easing-standard-decelerate),
    transform 220ms var(--md-sys-motion-easing-emphasized-decelerate);
}

:global(.md3-fade-through-leave-to) {
  opacity: 0;
}

:global(.md3-fade-through-enter-from) {
  opacity: 0;
  transform: translateY(10px);
}

/* Drilling into a detail (config workspace) and back: shared axis X */
:global(.md3-axis-forward-leave-active),
:global(.md3-axis-back-leave-active) {
  transition:
    opacity 70ms var(--md-sys-motion-easing-emphasized-accelerate),
    transform 90ms var(--md-sys-motion-easing-emphasized-accelerate);
}

:global(.md3-axis-forward-enter-active),
:global(.md3-axis-back-enter-active) {
  transition:
    opacity 160ms var(--md-sys-motion-easing-standard-decelerate),
    transform 240ms var(--md-sys-motion-easing-emphasized-decelerate);
}

:global(.md3-axis-forward-leave-to) {
  opacity: 0;
  transform: translateX(-16px);
}

:global(.md3-axis-forward-enter-from) {
  opacity: 0;
  transform: translateX(28px);
}

:global(.md3-axis-back-leave-to) {
  opacity: 0;
  transform: translateX(16px);
}

:global(.md3-axis-back-enter-from) {
  opacity: 0;
  transform: translateX(-28px);
}

@media (prefers-reduced-motion: reduce) {
  :global(.md3-fade-through-leave-active),
  :global(.md3-fade-through-enter-active),
  :global(.md3-axis-forward-leave-active),
  :global(.md3-axis-forward-enter-active),
  :global(.md3-axis-back-leave-active),
  :global(.md3-axis-back-enter-active) {
    transition: opacity 60ms linear;
  }

  :global(.md3-fade-through-enter-from),
  :global(.md3-axis-forward-enter-from),
  :global(.md3-axis-back-enter-from),
  :global(.md3-fade-through-leave-to),
  :global(.md3-axis-forward-leave-to),
  :global(.md3-axis-back-leave-to) {
    transform: none;
  }
}
</style>
