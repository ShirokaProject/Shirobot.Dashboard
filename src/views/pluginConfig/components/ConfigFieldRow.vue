<template>
  <div class="field" :class="{ stacked }">
    <!-- Inline types: text on the left, a compact control on the right. Long text types stack. -->
    <div class="field-text">
      <label :for="inputId" class="field-label">{{ field.label }}</label>
      <p class="field-desc">{{ field.description }}<code class="field-key">{{ field.item.key }}</code></p>
    </div>

    <div class="field-control">
      <!-- Nested section: its own fields, bound into this value -->
      <div v-if="editor === 'section'" class="nested-section">
        <ConfigFieldRow
          v-for="child in childFields"
          :key="child.item.key"
          :field="child"
          :id-prefix="inputId"
          :disabled="isDisabled"
          :model-value="objectValue[child.item.key]"
          @update:model-value="emit('update:modelValue', { ...objectValue, [child.item.key]: $event })"
        />
      </div>

      <SectionListEditor
        v-else-if="editor === 'sectionList'"
        :model-value="modelValue"
        :item-fields="field.item.item_fields || []"
        :item-label="field.label"
        :id-prefix="inputId"
        :disabled="isDisabled"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <ScalarListEditor
        v-else-if="editor === 'scalarList'"
        :input-id="inputId"
        :model-value="modelValue"
        :item-type="field.item.item_type || 'string'"
        :placeholder="field.item.placeholder"
        :disabled="isDisabled"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <JsonValueEditor
        v-else-if="editor === 'json'"
        :input-id="inputId"
        :model-value="modelValue"
        :expect="jsonShape"
        :disabled="isDisabled"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <el-switch
        v-else-if="type === 'boolean'"
        :id="inputId"
        :disabled="isDisabled"
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
          :disabled="isDisabled"
          :aria-checked="Number(modelValue) === option.value"
          :title="`${option.value}`"
          @click="emit('update:modelValue', option.value)"
        >{{ option.label }}</button>
      </div>

      <el-input-number
        v-else-if="type === 'number' || type === 'integer'"
        :id="inputId"
        class="number-input"
        :disabled="isDisabled"
        :model-value="typeof modelValue === 'number' ? modelValue : undefined"
        :min="field.item.min ?? undefined"
        :max="field.item.max ?? undefined"
        @update:model-value="emit('update:modelValue', $event ?? null)"
      />

      <el-select
        v-else-if="type === 'select'"
        :id="inputId"
        class="select-input"
        :disabled="isDisabled"
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
        :disabled="isDisabled"
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
        :disabled="isDisabled"
        :model-value="String(modelValue ?? '')"
        :placeholder="field.item.placeholder || ''"
        @update:model-value="emit('update:modelValue', $event)"
      />

      <el-input
        v-else
        :id="inputId"
        :disabled="isDisabled"
        :model-value="String(modelValue ?? '')"
        :placeholder="field.item.placeholder || ''"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PluginConfigMap, PluginConfigValue } from '../../../api'
import { createConfigField, isConfigObject, isFieldVisible, type ConfigField } from '../usePluginConfig'
import JsonValueEditor from './JsonValueEditor.vue'
import ScalarListEditor from './ScalarListEditor.vue'
import SectionListEditor from './SectionListEditor.vue'

const props = defineProps<{
  field: ConfigField
  modelValue: PluginConfigValue | undefined
  /** Distinguishes ids of fields nested in sections and list items. */
  idPrefix?: string
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: PluginConfigValue] }>()

const SCALAR_ITEM_TYPES = new Set(['string', 'integer', 'number', 'boolean'])

const type = computed(() => props.field.item.type)
const inputId = computed(() => `${props.idPrefix ?? 'cfg'}-${props.field.item.key}`)
const isDisabled = computed(() => props.disabled || !props.field.enabled)

/**
 * Which editor the value needs. Lists and objects never fall through to a text box: a value whose
 * schema says "string" but is structured (older hosts reported nested config that way) is edited as JSON.
 */
const editor = computed(() => {
  const item = props.field.item
  const value = props.modelValue
  if (item.type === 'section' && item.fields?.length && (value === undefined || value === null || isConfigObject(value)))
    return 'section'
  if (item.type === 'array' && item.item_type === 'section' && item.item_fields?.length) return 'sectionList'
  if (item.type === 'array' && SCALAR_ITEM_TYPES.has(item.item_type ?? 'string') &&
      (!Array.isArray(value) || value.every(element => !isConfigObject(element) && !Array.isArray(element))))
    return 'scalarList'
  if (item.type === 'array' || item.type === 'object' || item.type === 'section' || Array.isArray(value) || isConfigObject(value))
    return 'json'
  return 'scalar'
})

const jsonShape = computed(() =>
  props.field.item.type === 'array' || Array.isArray(props.modelValue) ? 'array' : 'object')

const objectValue = computed<PluginConfigMap>(() => isConfigObject(props.modelValue) ? props.modelValue : {})

const childFields = computed(() => (props.field.item.fields ?? [])
  .filter(item => isFieldVisible(item, objectValue.value))
  .map(item => createConfigField(item, objectValue.value))
  .sort((left, right) => (left.item.order ?? Number.MAX_SAFE_INTEGER) - (right.item.order ?? Number.MAX_SAFE_INTEGER)))

// Free text, lists and nested values need width; everything else fits beside its label.
const stacked = computed(() => editor.value !== 'scalar' ||
  (type.value === 'string' || type.value === 'text' || type.value === 'password') && !props.field.enumOptions)
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

.nested-section {
  padding: 0 var(--md-space-4);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium, 12px);
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
