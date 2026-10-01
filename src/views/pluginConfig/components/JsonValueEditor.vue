<template>
  <div class="json-editor">
    <el-input
      :id="inputId"
      type="textarea"
      class="json-input"
      spellcheck="false"
      :autosize="{ minRows: 3, maxRows: 18 }"
      :disabled="disabled"
      :model-value="text"
      @update:model-value="onInput"
    />
    <p v-if="error" class="editor-message error">JSON 格式不正确，修改尚未应用：{{ error }}</p>
    <p v-else class="editor-message">以 JSON 编辑{{ expect === 'array' ? '列表' : '对象' }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PluginConfigValue } from '../../../api'
import { isConfigObject } from '../usePluginConfig'

const props = defineProps<{
  modelValue: PluginConfigValue | undefined
  /** The shape the value must keep: free-form tables stay objects, lists stay arrays. */
  expect: 'object' | 'array'
  inputId?: string
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: PluginConfigValue] }>()

const format = (value: PluginConfigValue | undefined) =>
  JSON.stringify(value ?? (props.expect === 'array' ? [] : {}), null, 2)

const text = ref(format(props.modelValue))
const error = ref('')

// Follow outside changes (reload, discard) but never overwrite what is being typed.
watch(() => props.modelValue, value => {
  if (error.value) return
  try {
    if (JSON.stringify(JSON.parse(text.value)) === JSON.stringify(value)) return
  } catch {
    // Unparseable draft: replace it below.
  }
  text.value = format(value)
}, { deep: true })

function onInput(value: string) {
  text.value = value
  let parsed: PluginConfigValue
  try {
    parsed = JSON.parse(value) as PluginConfigValue
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
    return
  }
  if (props.expect === 'array' ? !Array.isArray(parsed) : !isConfigObject(parsed)) {
    error.value = props.expect === 'array' ? '需要一个列表 [ ... ]' : '需要一个对象 { ... }'
    return
  }
  error.value = ''
  emit('update:modelValue', parsed)
}
</script>

<style scoped>
.json-editor {
  display: flex;
  flex-direction: column;
  gap: var(--md-space-1);
  width: 100%;
}

.json-input :deep(textarea) {
  font: 400 12px / 18px var(--font-mono);
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
