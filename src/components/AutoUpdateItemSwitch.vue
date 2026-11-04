<template>
  <!-- Only while daily auto-update is on for this kind; otherwise the switch would change nothing -->
  <div v-if="autoUpdate.available && autoUpdate.exclusions && autoUpdate.enabled[kind]" class="auto-update-item">
    <span class="auto-update-item-text">
      <strong>自动更新</strong>
      <small>{{ hint ?? (included ? `每天 ${autoUpdate.time} 检查并更新` : '不参与自动更新，需要时手动更新') }}</small>
    </span>
    <el-switch
      :model-value="included"
      :disabled="disabled"
      :loading="autoUpdate.saving"
      :aria-label="`自动更新 ${id}`"
      @change="(value: string | number | boolean) => setAutoUpdateIncluded(kind, id, Boolean(value))"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { autoUpdate, isAutoUpdateExcluded, loadAutoUpdate, setAutoUpdateIncluded, type AutoUpdateKind } from '../features/autoUpdate'

const props = defineProps<{
  kind: AutoUpdateKind
  /** Plugin ID or adapter package ID */
  id: string
  /** Shown instead of the default text, e.g. why this item cannot auto-update */
  hint?: string
  disabled?: boolean
}>()

const included = computed(() => !props.disabled && !isAutoUpdateExcluded(props.kind, props.id))

onMounted(() => loadAutoUpdate())
</script>

<style scoped>
.auto-update-item {
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
  padding: var(--md-space-3) var(--md-space-4);
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container);
}

.auto-update-item-text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.auto-update-item-text strong {
  font: var(--md-sys-typescale-label-large);
}

.auto-update-item-text small {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}
</style>
