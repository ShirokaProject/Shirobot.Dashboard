<template>
  <div class="list-editor">
    <el-input
      :id="inputId"
      type="textarea"
      :autosize="{ minRows: 2, maxRows: 12 }"
      :disabled="disabled"
      :placeholder="placeholder || '每行一项'"
      :model-value="text"
      @update:model-value="onInput"
    />
    <p v-if="error" class="editor-message error">{{ error }}，修改尚未应用</p>
    <p v-else class="editor-message">每行一项{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PluginConfigValue } from '../../../api'

const props = defineProps<{
  modelValue: PluginConfigValue | undefined
  /** Element type from the schema: string, integer, number or boolean. */
  itemType: string
  inputId?: string
  placeholder?: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: PluginConfigValue[]] }>()

const hint = computed(() => ({
  integer: '，填整数',
  number: '，填数字',
  boolean: '，填 true 或 false'
} as Record<string, string>)[props.itemType] ?? '')

const items = () => Array.isArray(props.modelValue) ? props.modelValue : []
const format = () => items().map(item => String(item)).join('\n')

const text = ref(format())
const error = ref('')

watch(() => props.modelValue, () => {
  if (error.value) return
  const parsed = parse(text.value)
  if (parsed.ok && JSON.stringify(parsed.values) === JSON.stringify(items())) return
  text.value = format()
}, { deep: true })

function parse(value: string): { ok: true; values: PluginConfigValue[] } | { ok: false; message: string } {
  const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const values: PluginConfigValue[] = []
  for (const [index, line] of lines.entries()) {
    if (props.itemType === 'integer' || props.itemType === 'number') {
      const number = Number(line)
      if (!Number.isFinite(number) || (props.itemType === 'integer' && !Number.isInteger(number)))
        return { ok: false, message: `第 ${index + 1} 项「${line}」不是${props.itemType === 'integer' ? '整数' : '数字'}` }
      values.push(number)
    } else if (props.itemType === 'boolean') {
      if (!/^(true|false)$/i.test(line)) return { ok: false, message: `第 ${index + 1} 项「${line}」不是 true 或 false` }
      values.push(line.toLowerCase() === 'true')
    } else {
      values.push(line)
    }
  }
  return { ok: true, values }
}

function onInput(value: string) {
  text.value = value
  const parsed = parse(value)
  if (!parsed.ok) {
    error.value = parsed.message
    return
  }
  error.value = ''
  emit('update:modelValue', parsed.values)
}
</script>

<style scoped>
.list-editor {
  display: flex;
  flex-direction: column;
  gap: var(--md-space-1);
  width: 100%;
}

.editor-message {
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.editor-message.error {
  color: var(--md-sys-color-error);
}
</style>
