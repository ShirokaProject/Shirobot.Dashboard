<template>
  <div class="section-list">
    <p v-if="!items.length" class="list-empty">还没有项目</p>

    <div v-for="(element, index) in items" :key="index" class="entry-card">
      <header class="item-header">
        <strong>{{ itemTitle(element, index) }}</strong>
        <div class="item-actions">
          <button
            type="button"
            class="md-button text compact"
            :disabled="disabled || index === 0"
            aria-label="上移"
            title="上移"
            @click="move(index, -1)"
          ><MdIcon name="arrow_upward" /></button>
          <button
            type="button"
            class="md-button text compact"
            :disabled="disabled || index === items.length - 1"
            aria-label="下移"
            title="下移"
            @click="move(index, 1)"
          ><MdIcon name="arrow_downward" /></button>
          <button
            type="button"
            class="md-button text compact danger"
            :disabled="disabled"
            aria-label="删除"
            title="删除"
            @click="remove(index)"
          ><MdIcon name="delete" /></button>
        </div>
      </header>
      <ConfigFieldRow
        v-for="field in fieldsFor(element)"
        :key="field.item.key"
        :field="field"
        :id-prefix="`${idPrefix}-${index}`"
        :disabled="disabled"
        :model-value="element[field.item.key]"
        @update:model-value="update(index, field.item.key, $event)"
      />
    </div>

    <button type="button" class="md-button tonal compact add-button" :disabled="disabled" @click="add">
      <MdIcon name="add" />添加 {{ itemLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MdIcon from '../../../components/MdIcon.vue'
import type { PluginConfigMap, PluginConfigSchemaItem, PluginConfigValue } from '../../../api'
import { createConfigField, createDefaultValue, isConfigObject, isFieldVisible } from '../usePluginConfig'
import ConfigFieldRow from './ConfigFieldRow.vue'

const props = defineProps<{
  modelValue: PluginConfigValue | undefined
  itemFields: PluginConfigSchemaItem[]
  itemLabel: string
  idPrefix: string
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: PluginConfigValue[]] }>()

const items = computed(() =>
  (Array.isArray(props.modelValue) ? props.modelValue : []).map(item => isConfigObject(item) ? item : {}))

// A readable title: the element's own name-like field when it has one.
function itemTitle(element: PluginConfigMap, index: number) {
  for (const key of ['name', 'display_name', 'id', 'title', 'key']) {
    const value = element[key]
    if (typeof value === 'string' && value.trim()) return `${index + 1}. ${value}`
  }
  return `${props.itemLabel} ${index + 1}`
}

function fieldsFor(element: PluginConfigMap) {
  return props.itemFields
    .filter(item => isFieldVisible(item, element))
    .map(item => createConfigField(item, element))
    .sort((left, right) => (left.item.order ?? Number.MAX_SAFE_INTEGER) - (right.item.order ?? Number.MAX_SAFE_INTEGER))
}

function update(index: number, key: string, value: PluginConfigValue) {
  emit('update:modelValue', items.value.map((element, at) => at === index ? { ...element, [key]: value } : element))
}

function add() {
  const element = Object.fromEntries(props.itemFields.map(item => [item.key, createDefaultValue(item)]))
  emit('update:modelValue', [...items.value, element])
}

function remove(index: number) {
  emit('update:modelValue', items.value.filter((_, at) => at !== index))
}

function move(index: number, offset: number) {
  const next = [...items.value]
  const [element] = next.splice(index, 1)
  next.splice(index + offset, 0, element)
  emit('update:modelValue', next)
}
</script>

<style scoped>
.section-list {
  display: flex;
  flex-direction: column;
  gap: var(--md-space-3);
  width: 100%;
}

.list-empty {
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.entry-card {
  padding: var(--md-space-2) var(--md-space-4);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium, 12px);
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--md-space-2);
  padding-top: var(--md-space-1);
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-title-small);
}

.item-actions {
  display: flex;
  gap: var(--md-space-1);
}

.add-button {
  align-self: flex-start;
}
</style>
