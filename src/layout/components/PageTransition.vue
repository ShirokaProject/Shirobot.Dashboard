<template>
  <Transition :name="name" mode="out-in">
    <component :is="component" :key="transitionKey" class="page-route-view" />
  </Transition>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

/**
 * page-down / page-up follow the sidebar indicator: moving to an item further down, the old
 * page lifts away and the new one rises in from below, and the other way round. page-fade is
 * for changes the sidebar does not show (a link inside a page, leaving the login).
 */
export type PageTransitionName = 'page-fade' | 'page-down' | 'page-up'

withDefaults(defineProps<{
  component: Component
  transitionKey: string
  name?: PageTransitionName
}>(), {
  name: 'page-fade'
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
 * Timed against the sidebar indicator (250ms): the old page is gone in 90ms, the new one
 * settles over 180ms, so content and indicator land within a few frames of each other.
 * Leaving is quicker than arriving; both ease out, so the motion starts the moment you click.
 * Transforms exist only while animating, so text never rests on a resampled layer.
 */
:global(.page-fade-leave-active),
:global(.page-down-leave-active),
:global(.page-up-leave-active) {
  transition:
    opacity 90ms var(--app-ease-out),
    transform 90ms var(--app-ease-out);
}

:global(.page-fade-enter-active),
:global(.page-down-enter-active),
:global(.page-up-enter-active) {
  transition:
    opacity 180ms var(--app-ease-out),
    transform 180ms var(--app-ease-out);
}

:global(.page-fade-leave-to),
:global(.page-fade-enter-from),
:global(.page-down-leave-to),
:global(.page-down-enter-from),
:global(.page-up-leave-to),
:global(.page-up-enter-from) {
  opacity: 0;
}

/* The content travels the way the indicator does, a short distance, so it reads as one move */
:global(.page-down-leave-to) { transform: translateY(-6px); }
:global(.page-down-enter-from) { transform: translateY(10px); }
:global(.page-up-leave-to) { transform: translateY(6px); }
:global(.page-up-enter-from) { transform: translateY(-10px); }

@media (prefers-reduced-motion: reduce) {
  :global(.page-down-leave-to),
  :global(.page-down-enter-from),
  :global(.page-up-leave-to),
  :global(.page-up-enter-from) {
    transform: none;
  }
}
</style>
