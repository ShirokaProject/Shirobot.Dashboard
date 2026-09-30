<template>
  <div class="field" :class="{ stacked }">
    <!-- Inline types: text on the left, a compact control on the right. Long text types stack. -->
    <div class="field-text">
      <label :for="inputId" class="field-label">{{ field.label }}</label>
      <p class="field-desc">{{ field.description }}<code class="field-key">{{ field.item.key }}</code></p>
    </div>

    <div class="field-control">
      <el-switch
        v-if="type === 'boolean'"
        :id="inputId"
        :disabled="!field.enabled"
        :model-value="Boolean(modelValue)"
        @update:model-value="emit('update:modelValue', Boolean($event))"
      />

      <div v-else-if="field.enumOptions" class="button-group" role="radiogroup" :aria-label="field.label">
        <button
          v-for="option in field.enumOptions"
          :key="option.value"
          type="button"
          role="radio"
          class="md-button compact toggle"
          :class="{ selected: Number(modelValue) === option.value }"
          :disabled="!field.enabled"
          :aria-checked="Number(modelValue) === option.value"
          :title="`${option.value}`"
          @click="emit('update:modelValue', option.value)"
        >{{ option.label }}</button>
      </div>

      <el-input-number
        v-else-if="type === 'number' || type === 'integer'"
        :id="inputId"
        class="number-input"
        :disabled="!field.enabled"
        :model-value="typeof modelValue === 'number' ? modelValue : undefined"
        :min="field.item.min ?? undefined"
        :max="field.item.max ?? undefined"
        controls-position="right"
        @update:model-value="emit('update:modelValue', $event ?? null)"
      />

      <el-select
        v-else-if="type === 'select'"
        :id="inputId"
        class="select-input"
        :disabled="!field.enabled"
        :model-value="modelValue as string | number"
        :placeholder="field.item.placeholder || '请选择'"
        @update:model-value="emit('update:modelValue', $event)"
      >
        <el-option v-for="option in field.item.options || []" :key="String(option)" :label="String(option)" :value="option" />
      </el-select>

      <el-input
        v-else-if="type === 'text'"
        :id="inputId"
        type="textarea"
        :disabled="!field.enabled"
        :rows="4"
        :model-value="String(modelValue ?? '')"
        :placeholder="field.item.placeholder || ''"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <el-input
        v-else-if="type === 'password'"
        :id="inputId"
        type="password"
        show-password
        :disabled="!field.enabled"
        :model-value="String(modelValue ?? '')"
        :placeholder="field.item.placeholder || ''"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <el-input
        v-else
        :id="inputId"
        :disabled="!field.enabled"
        :model-value="String(modelValue ?? '')"
        :placeholder="field.item.placeholder || ''"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PluginConfigValue } from '../../../api'
import type { ConfigField } from '../usePluginConfig'

const props = defineProps<{
  field: ConfigField
  modelValue: PluginConfigValue | undefined
}>()

const emit = defineEmits<{ 'update:modelValue': [value: PluginConfigValue] }>()

const type = computed(() => props.field.item.type)
const inputId = computed(() => `cfg-${props.field.item.key}`)
// Free text needs width; everything else fits beside its label.
const stacked = computed(() => (type.value === 'string' || type.value === 'text' || type.value === 'password') && !props.field.enumOptions)
</script>

<style scoped>
.field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--md-space-2) var(--md-space-6);
  padding: var(--md-space-3) 0;
}

.field.stacked {
  grid-template-columns: minmax(0, 1fr);
}

.field-text {
  min-width: 0;
}

.field-label {
  display: block;
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-title-small);
}

.field-desc {
  margin: 2px 0 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

/* The raw key, for people matching fields against config files */
.field-key {
  color: var(--md-sys-color-outline);
  font: 400 11px / 16px var(--font-mono);
  opacity: 0.75;
  transition: opacity var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.field-key::before {
  content: '(';
}

.field-key::after {
  content: ')';
}

.field:hover .field-key {
  opacity: 1;
}

.field-control {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.field.stacked .field-control {
  justify-content: stretch;
}

.field.stacked .field-control > * {
  width: 100%;
}

.number-input {
  width: 168px;
}

.select-input {
  width: 220px;
}

.button-group {
  flex-wrap: wrap;
  justify-content: flex-end;
}

@media (max-width: 599px) {
  .field {
    grid-template-columns: minmax(0, 1fr);
  }

  .field-control {
    justify-content: flex-start;
  }
}
</style>
