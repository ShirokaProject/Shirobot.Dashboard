<template>
  <Transition :name="name" mode="out-in">
    <component :is="component" :key="transitionKey" class="page-route-view" />
  </Transition>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

type PageTransitionName = 'md3-fade-through' | 'md3-shared-axis-y'

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

/* Material fade-through: exit ~short2 accelerate, enter ~short4 decelerate. */
:global(.md3-fade-through-enter-active) {
  transition: opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard-decelerate);
}

:global(.md3-fade-through-leave-active) {
  transition: opacity var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard-accelerate);
}

:global(.md3-fade-through-enter-from),
:global(.md3-fade-through-leave-to) {
  opacity: 0;
}

:global(.md3-fade-through-enter-to),
:global(.md3-fade-through-leave-from) {
  opacity: 1;
}

/* Optional: Shared axis Y for future flow-like pages only. */
:global(.md3-shared-axis-y-enter-active),
:global(.md3-shared-axis-y-leave-active) {
  transition:
    opacity var(--md-sys-motion-duration-short3) var(--md-sys-motion-easing-standard),
    transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

:global(.md3-shared-axis-y-enter-from) {
  opacity: 0;
  transform: translateY(10px);
}

:global(.md3-shared-axis-y-leave-to) {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {
  :global(.md3-fade-through-enter-active),
  :global(.md3-fade-through-leave-active),
  :global(.md3-shared-axis-y-enter-active),
  :global(.md3-shared-axis-y-leave-active) {
    transition: none;
  }

  :global(.md3-shared-axis-y-enter-from),
  :global(.md3-shared-axis-y-leave-to) {
    transform: none;
  }
}
</style>
