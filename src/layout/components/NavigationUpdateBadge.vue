<template>
  <span v-if="count" class="update-badge" :class="{ floating }" :title="`${count} 项可更新`" :aria-label="`${count} 项可更新`">
    {{ count > 99 ? '99+' : count }}
  </span>
</template>

<script setup lang="ts">
defineProps<{ count?: number; floating?: boolean }>()
</script>

<style scoped>
.update-badge {
  display: inline-flex;
  min-width: 20px;
  height: 20px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  margin-left: auto;
  padding: 0 5px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
  font: var(--md-sys-typescale-label-small);
}

.update-badge.floating {
  position: absolute;
  top: -2px;
  right: -2px;
  margin: 0;
}
</style>
