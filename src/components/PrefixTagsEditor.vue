<template>
  <div class="prefix-editor">
    <el-input-tag
      :id="inputId"
      :delimiter="/\s+/"
      add-tag-on-blur
      :disabled="disabled"
      :placeholder="placeholder || '输入前缀后回车，例如 !'"
      :model-value="tags"
      @update:model-value="onInput"
    />
    <p v-if="hint" class="editor-message">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * Message prefixes as tags. The host stores them as one string separated by whitespace, so a prefix cannot contain
 * spaces: typing a space finishes the tag, like Enter.
 */
const props = withDefaults(defineProps<{
  modelValue: string | null | undefined
  inputId?: string
  placeholder?: string | null
  disabled?: boolean
  hint?: string | null
}>(), { inputId: undefined, placeholder: null, disabled: false, hint: '回车或空格添加，点击 × 删除；带上任意一个前缀即可触发' })

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const split = (value: string | null | undefined) => [...new Set((value ?? '').split(/\s+/).filter(Boolean))]

const tags = ref(split(props.modelValue))

watch(() => props.modelValue, value => {
  if (split(value).join(' ') !== tags.value.join(' ')) tags.value = split(value)
})

function onInput(value: string[] | undefined) {
  tags.value = split((value ?? []).join(' '))
  emit('update:modelValue', tags.value.join(' '))
}
</script>

<style scoped>
.prefix-editor {
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
</style>
