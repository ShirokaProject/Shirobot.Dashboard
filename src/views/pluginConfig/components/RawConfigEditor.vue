<template>
  <div class="raw-editor">
    <p class="raw-hint">
      直接编辑 config.toml，包括表单中没有的字段。保存时校验 TOML 格式，通过后立即应用。
    </p>
    <textarea
      ref="textarea"
      :value="modelValue"
      class="raw-text"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      aria-label="config.toml"
      :readonly="readonly"
      @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      @keydown.tab.prevent="indent"
    ></textarea>
    <p v-if="error" class="raw-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ modelValue: string; error?: string; readonly?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const textarea = ref<HTMLTextAreaElement | null>(null)

// Tab inserts indentation instead of leaving the editor.
function indent() {
  const element = textarea.value
  if (!element || props.readonly) return
  const { selectionStart: start, selectionEnd: end, value } = element
  emit('update:modelValue', value.slice(0, start) + '  ' + value.slice(end))
  requestAnimationFrame(() => element.setSelectionRange(start + 2, start + 2))
}
</script>

<style scoped>
.raw-editor {
  display: flex;
  flex-direction: column;
  gap: var(--md-space-3);
  min-height: 0;
}

.raw-hint,
.raw-error {
  margin: 0;
  font: var(--md-sys-typescale-body-small);
}

.raw-hint {
  color: var(--md-sys-color-on-surface-variant);
}

.raw-error {
  color: var(--md-sys-color-error);
  white-space: pre-wrap;
}

.raw-text {
  flex: 1;
  min-height: 360px;
  height: min(70vh, 760px);
  padding: var(--md-space-4);
  border: 0;
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--app-inset);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
  color: var(--md-sys-color-on-surface);
  font: 400 13px / 20px var(--font-mono);
  resize: vertical;
  tab-size: 2;
}

.raw-text:focus {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--md-sys-color-primary);
}
</style>
