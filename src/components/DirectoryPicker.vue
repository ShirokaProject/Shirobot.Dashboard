<template>
  <div class="directory-picker">
    <el-select
      :id="inputId"
      class="directory-select"
      multiple
      filterable
      allow-create
      default-first-option
      :reserve-keyword="false"
      :disabled="disabled"
      :loading="loading"
      :placeholder="placeholder || (kind === 'users' ? '搜索好友，或输入 实例ID:用户ID' : '搜索群，或输入群号')"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', normalizeDirectoryValues($event))"
    >
      <el-option v-for="option in options" :key="option.value" :label="option.name" :value="option.value">
        <span class="option-name">{{ option.name }}</span>
        <span class="option-detail">{{ option.detail }}</span>
      </el-option>
    </el-select>
    <p class="picker-note">
      <span v-if="error">{{ error }}，可直接输入。</span>
      <span v-else-if="unavailable.length">{{ unavailable.map(item => `${item.instance_name}: ${item.reason}`).join('；') }}，可直接输入。</span>
      <span v-else>{{ kind === 'users' ? '列出运行中实例的好友；也可输入 实例ID:用户ID。' : '列出运行中实例加入的群；也可输入群号。' }}</span>
      <button type="button" class="refresh" :disabled="loading" @click="load(true)">刷新</button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { getApiErrorMessage, getDirectory, type DirectoryKind, type DirectoryResponse } from '../api'
import { directoryOptions, normalizeDirectoryValues } from '../features/directory'

const props = defineProps<{
  kind: DirectoryKind
  modelValue: string[]
  inputId?: string
  placeholder?: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const listing = shallowRef<DirectoryResponse>({ entries: [], unavailable: [] })
const loading = ref(false)
const error = ref('')
// Values already chosen stay listed (by their raw text) even when no instance reports them now.
const options = computed(() => {
  const known = directoryOptions(props.kind, listing.value.entries)
  const values = new Set(known.map(option => option.value))
  return [...known, ...props.modelValue.filter(value => !values.has(value)).map(value => ({ value, name: value, detail: '' }))]
})
const unavailable = computed(() => listing.value.unavailable)

async function load(refresh = false) {
  loading.value = true
  error.value = ''
  try {
    listing.value = await getDirectory(props.kind, refresh)
  } catch (cause) {
    error.value = getApiErrorMessage(cause, props.kind === 'users' ? '好友列表读取失败' : '群列表读取失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => { void load() })
</script>

<style scoped>
.directory-picker {
  display: flex;
  flex-direction: column;
  gap: var(--md-space-1);
  width: 100%;
}

.directory-select {
  width: 100%;
}

.option-name {
  color: var(--md-sys-color-on-surface);
}

.option-detail {
  margin-left: var(--md-space-2);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.picker-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--md-space-2);
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.refresh {
  padding: 0;
  border: 0;
  background: none;
  color: var(--md-sys-color-primary);
  font: inherit;
  cursor: pointer;
}

.refresh:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
