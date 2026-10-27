<template>
  <div class="directory-picker">
    <el-select
      :id="inputId"
      class="directory-select"
      popper-class="directory-dropdown"
      multiple
      filterable
      :allow-create="!hasMatches"
      default-first-option
      :reserve-keyword="false"
      :filter-method="search"
      :disabled="disabled"
      :loading="loading"
      :placeholder="placeholder || (kind === 'users' ? '搜索昵称或账号' : '搜索群名或群号')"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', normalizeDirectoryValues($event))"
      @visible-change="onVisibleChange"
    >
      <el-option v-for="option in shown" :key="option.value" :label="option.label" :value="option.value">
        <span class="option-name">{{ option.name }}</span>
        <span class="option-id">{{ option.id }}<template v-if="option.instances"> · {{ option.instances }}</template></span>
      </el-option>
      <template #empty>
        <p class="dropdown-hint">{{ query ? '没有匹配，回车直接添加' : kind === 'users' ? '输入昵称或账号搜索好友，也可直接输入 实例ID:用户ID' : '输入群名或群号搜索' }}</p>
      </template>
    </el-select>
    <p v-if="error || unavailable.length" class="picker-note">
      {{ error || unavailable.map(item => `${item.instance_name}: ${item.reason}`).join('；') }}，可直接输入。
      <button type="button" class="refresh" :disabled="loading" @click="load(true)">刷新</button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue'
import { getApiErrorMessage, getDirectory, type DirectoryKind, type DirectoryResponse } from '../api'
import { directoryOptions, normalizeDirectoryValues, searchDirectory, type DirectoryOption } from '../features/directory'

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
const query = ref('')

const options = computed(() => directoryOptions(props.kind, listing.value.entries))
// Before typing, the menu shows only what is chosen (to remove it); Element Plus also keeps the labels of
// options it has rendered, so chosen tags keep their name and number after a search hides them.
const shown = computed<DirectoryOption[]>(() => {
  if (query.value.trim()) return searchDirectory(options.value, query.value)
  const byValue = new Map(options.value.map(option => [option.value, option]))
  return props.modelValue.map(value => byValue.get(value) ?? { value, name: value, id: '', instances: '', label: value })
})
// Typed text becomes its own option only when nothing matches, so Enter takes the first match rather than the
// half-typed name; with no match, Enter adds the text as typed (an ID the adapters cannot list).
const hasMatches = computed(() => query.value.trim() !== '' && shown.value.length > 0)
const unavailable = computed(() => listing.value.unavailable)

function search(text: string) {
  query.value = text
}

function onVisibleChange(open: boolean) {
  if (!open) query.value = ''
}

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

/* Chosen tags wrap onto more lines; a pill's round ends would cut them off, so it becomes a rounded box */
.directory-select :deep(.el-select__wrapper) {
  border-radius: var(--md-sys-shape-corner-large) !important;
  padding: var(--md-space-2) var(--md-space-4);
}

.picker-note {
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.refresh {
  margin-left: var(--md-space-1);
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

.option-name {
  overflow: hidden;
  color: var(--md-sys-color-on-surface);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-id {
  flex: none;
  margin-left: auto;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.dropdown-hint {
  margin: 0;
  padding: var(--md-space-3) var(--md-space-4);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}
</style>

<style>
/* Teleported out of the component: compact single-line rows, name left and number right, about six visible */
.directory-dropdown .el-select-dropdown__wrap {
  max-height: 236px;
}

.directory-dropdown .el-select-dropdown__item {
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
  height: 36px;
  line-height: 36px;
}

/* Room for Element's check mark on chosen rows, so it does not sit on the number */
.directory-dropdown.is-multiple .el-select-dropdown__item.is-selected,
.directory-dropdown .el-select-dropdown__item.is-selected {
  padding-right: 40px;
}
</style>
