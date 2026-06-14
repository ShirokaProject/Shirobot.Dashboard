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

/* Material motion: fast Fade through for top-level destination changes.
   Pure opacity prevents layout-origin artifacts and hidden overlap. */
:global(.md3-fade-through-enter-active) {
  transition: opacity 72ms cubic-bezier(0.2, 0, 0, 1);
}

:global(.md3-fade-through-leave-active) {
  transition: opacity 36ms cubic-bezier(0.4, 0, 1, 1);
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
    opacity 180ms cubic-bezier(0.2, 0, 0, 1),
    transform 220ms cubic-bezier(0.2, 0, 0, 1);
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
