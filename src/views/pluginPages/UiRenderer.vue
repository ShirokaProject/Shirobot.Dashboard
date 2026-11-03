<template>
  <div v-if="['column', 'row', 'card'].includes(node.type)" :class="['ui-layout', `ui-${node.type}`]">
    <h4 v-if="node.title">{{ node.title }}</h4>
    <UiRenderer v-for="(child, index) in node.children || []" :key="index" v-bind="childProps(child)" v-on="handlers" />
  </div>
  <div v-else-if="node.type === 'tabs'">
    <div class="button-group" role="tablist"><button v-for="tab in node.tabs || []" :key="tab.id" type="button" class="md-button tonal" role="tab" :aria-selected="activeTab === tab.id" :disabled="busy" @click="emit('state', { [node.id!]: tab.id })">{{ tab.title }}</button></div>
    <template v-for="tab in node.tabs || []" :key="tab.id"><div v-if="activeTab === tab.id" role="tabpanel"><UiRenderer v-for="(child, i) in tab.children" :key="i" v-bind="childProps(child)" v-on="handlers" /></div></template>
  </div>
  <hr v-else-if="node.type === 'divider'" />
  <SafeMarkdown v-else-if="node.type === 'text' && node.markdown" :text="node.text || ''" />
  <p v-else-if="node.type === 'text'" class="ui-text">{{ node.text }}</p>
  <p v-else-if="node.type === 'notice'" :class="['ui-notice', node.tone]" role="status">{{ node.text }}</p>
  <p v-else-if="node.type === 'empty'" class="ui-empty">{{ node.text }}</p>
  <div v-else-if="node.type === 'metric'" class="ui-metric"><small>{{ node.label }}</small><strong>{{ node.value }}</strong><small v-if="node.hint">{{ node.hint }}</small></div>
  <pre v-else-if="node.type === 'code'">{{ node.text }}</pre>
  <PageImage v-else-if="node.type === 'image' && node.file" :plugin-id="pluginId" :page-id="pageId" :file="node.file" :alt="node.alt" />
  <button v-else-if="node.type === 'link' && node.page" class="md-button text" type="button" :disabled="busy" @click="emit('navigate', node.page, {})">{{ node.text }}</button>
  <a v-else-if="node.type === 'link' && safeUrl" :href="safeUrl" target="_blank" rel="noopener noreferrer">{{ node.text }}</a>
  <form v-else-if="node.type === 'filters'" class="ui-filters" @submit.prevent="emit('state', { ...filterDraft, ...pagerReset })">
    <div v-for="filter in node.filters || []" :key="filter.key" class="ui-filter">
      <label :for="`${inputPrefix}-${filter.key}`">{{ filter.label }}</label>
      <el-select v-if="filter.kind === 'select'" :id="`${inputPrefix}-${filter.key}`" v-model="filterDraft[filter.key]" :disabled="busy" placeholder="全部" clearable>
        <el-option v-for="option in filter.options" :key="option.value" :value="option.value" :label="option.label" />
      </el-select>
      <el-switch v-else-if="filter.kind === 'switch'" :id="`${inputPrefix}-${filter.key}`" v-model="filterDraft[filter.key]" active-value="true" inactive-value="false" :disabled="busy" />
      <el-input v-else :id="`${inputPrefix}-${filter.key}`" v-model="filterDraft[filter.key]" :placeholder="`输入${filter.label}`" :disabled="busy" clearable />
    </div>
    <button type="submit" class="md-button tonal ui-filter-submit" :disabled="busy"><MdIcon name="search" />搜索</button>
  </form>
  <div v-else-if="['gallery', 'list', 'table'].includes(node.type)">
    <div v-if="node.type === 'table'" class="ui-table"><table><thead><tr><th v-for="(column, i) in node.columns || []" :key="i">{{ column }}</th><th>操作</th></tr></thead><tbody><tr v-for="row in node.rows || []" :key="row.key"><td v-for="(cell, i) in row.cells" :key="i">{{ cell }}</td><td><button v-for="action in actions(row.actions)" :key="action.id" class="md-button text" type="button" :disabled="busy" @click="emit('event', { kind: 'action', element: node.id!, action: action.id, item: row.key }, action)">{{ action.label }}</button></td></tr></tbody></table></div>
    <div v-else :class="['ui-items', node.type]">
      <article v-for="row in node.rows || []" :key="row.key" class="ui-item">
        <div v-if="row.card?.image" class="ui-item-media"><PageImage :plugin-id="pluginId" :page-id="pageId" :file="row.card.image" :alt="row.card.title" /></div>
        <div class="ui-item-body">
          <h4 v-if="row.card?.title" class="ui-item-title" :title="row.card.title">{{ row.card.title }}</h4>
          <p v-if="row.card?.description" class="ui-item-description">{{ row.card.description }}</p>
          <div v-if="row.card?.tags?.length" class="ui-tags"><span v-for="tag in row.card.tags" :key="tag">{{ tag }}</span></div>
          <small v-if="row.card?.meta" class="ui-item-meta">{{ row.card.meta }}</small>
          <div v-if="actions(row.actions).length" class="ui-item-actions"><button v-for="action in actions(row.actions)" :key="action.id" type="button" class="md-button text compact" :class="{ danger: action.danger }" :disabled="busy" @click="emit('event', { kind: 'action', element: node.id!, action: action.id, item: row.key }, action)">{{ action.label }}</button></div>
        </div>
      </article>
    </div>
  </div>
  <div v-else-if="node.type === 'pager'" class="ui-pager"><button class="md-button text" type="button" :disabled="busy || pageNumber <= 1" @click="emit('state', { [node.id!]: String(pageNumber - 1) })">上一页</button><span>第 {{ pageNumber }} 页<span v-if="node.total != null"> · 共 {{ node.total }} 条</span></span><button class="md-button text" type="button" :disabled="busy || !hasMore" @click="emit('state', { [node.id!]: String(pageNumber + 1) })">下一页</button></div>
  <button v-else-if="node.type === 'button'" type="button" class="md-button tonal" :disabled="busy" @click="emit('event', { kind: 'click', element: node.id! }, node)">{{ node.label }}</button>
  <div v-else-if="node.type === 'upload'" class="ui-upload">
    <input ref="fileInput" type="file" hidden multiple :accept="node.accept?.join(',')" :disabled="busy" @change="upload" />
    <button type="button" class="md-button tonal" :disabled="busy" @click="fileInput?.click()"><MdIcon name="upload" />{{ node.label }}</button>
    <small>支持批量上传 · 单文件上限 {{ ((node.max_bytes || 0) / 1000000).toFixed(1) }} MB</small>
  </div>
  <form v-else-if="node.type === 'form' && (!node.dialog || dialog)" class="ui-form" @submit.prevent="emit('event', { kind: 'submit', element: node.id!, values: { ...values } })">
    <label v-for="field in node.fields || []" :key="field.key" :for="`${node.id}-${field.key}`"><span>{{ field.label }}{{ field.required ? ' *' : '' }}</span>
      <textarea v-if="field.kind === 'textarea'" :id="`${node.id}-${field.key}`" v-model="values[field.key] as string" :required="field.required" :maxlength="field.max_length" :disabled="busy" />
      <input v-else-if="field.kind === 'switch'" :id="`${node.id}-${field.key}`" v-model="values[field.key]" type="checkbox" :disabled="busy" />
      <input v-else-if="field.kind === 'number'" :id="`${node.id}-${field.key}`" v-model.number="values[field.key]" type="number" :min="field.min" :max="field.max" :step="field.integer ? 1 : 'any'" :required="field.required" :disabled="busy" />
      <select v-else-if="['select', 'multiselect'].includes(field.kind)" :id="`${node.id}-${field.key}`" v-model="values[field.key]" :multiple="field.kind === 'multiselect'" :required="field.required" :disabled="busy"><option v-if="field.kind === 'select'" value="">请选择</option><option v-for="option in field.options || []" :key="option.value" :value="option.value">{{ option.label }}</option></select>
      <DirectoryPicker v-else-if="['user', 'users', 'group', 'groups'].includes(field.kind)" :kind="field.kind.startsWith('user') ? 'users' : 'groups'" :model-value="directoryValue(field.key)" :disabled="busy" @update:model-value="setDirectory(field.key, $event, field.kind.endsWith('s'))" />
      <input v-else :id="`${node.id}-${field.key}`" v-model="values[field.key]" :type="field.kind === 'secret' ? 'password' : 'text'" :required="field.required" :maxlength="field.max_length" :pattern="field.pattern" :disabled="busy" autocomplete="off" />
      <small v-if="field.description">{{ field.description }}</small><small v-if="errors[field.key]" role="alert" class="ui-error">{{ errors[field.key] }}</small>
    </label><button v-if="node.submit_label" class="md-button tonal" :disabled="busy">{{ node.submit_label }}</button>
  </form>
  <p v-else-if="!['form', 'link'].includes(node.type)">暂不支持的页面组件：{{ node.type }}</p>
</template>
<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import type { UiNode, PageState, PageEvent } from '../../api'
import { ElInput, ElOption, ElSelect, ElSwitch } from 'element-plus'
import MdIcon from '../../components/MdIcon.vue'
import DirectoryPicker from '../../components/DirectoryPicker.vue'
import PageImage from './PageImage.vue'
import SafeMarkdown from './SafeMarkdown.vue'
const props = withDefaults(defineProps<{ node: UiNode; state: PageState; pluginId: string; pageId: string; busy: boolean; pagerReset: PageState; errors?: Record<string, string>; dialog?: boolean; initialValues?: Record<string, unknown> }>(), { errors: () => ({}) })
const emit = defineEmits<{ state: [patch: PageState]; event: [event: PageEvent, action?: { confirm?: string; label?: string; danger?: boolean }]; upload: [node: UiNode, files: File[]]; navigate: [id: string, state: PageState] }>()
const handlers = { state: (s: PageState) => emit('state', s), event: (e: PageEvent, a?: { confirm?: string; label?: string; danger?: boolean }) => emit('event', e, a), upload: (n: UiNode, files: File[]) => emit('upload', n, files), navigate: (id: string, state: PageState) => emit('navigate', id, state) }
const fileInput = ref<HTMLInputElement | null>(null)
const inputPrefix = useId()
const childProps = (node: UiNode) => ({ ...props, node, dialog: false })
const filterDraft = reactive<PageState>({}), values = reactive<Record<string, unknown>>({})
watch(() => [props.node, props.state, props.initialValues], () => {
  for (const filter of props.node.filters || []) filterDraft[filter.key] = props.state[filter.key] || ''
  for (const field of props.node.fields || []) values[field.key] = props.initialValues?.[field.key] ?? field.value ?? (field.kind === 'switch' ? false : ['multiselect', 'users', 'groups'].includes(field.kind) ? [] : '')
}, { immediate: true })
const activeTab = computed(() => props.node.tabs?.find(t => t.id === props.state[props.node.id!])?.id || props.node.tabs?.[0]?.id)
const pageNumber = computed(() => Math.max(1, Number(props.state[props.node.id!]) || 1))
const hasMore = computed(() => props.node.has_more ?? (props.node.total != null && pageNumber.value * (props.node.page_size || 24) < props.node.total))
const safeUrl = computed(() => { try { const u = new URL(props.node.url || ''); return ['http:', 'https:'].includes(u.protocol) ? u.href : '' } catch { return '' } })
function actions(allowed: string[]) { return (props.node.actions || []).filter(a => allowed.includes(a.id)) }
function upload(event: Event) { const input = event.target as HTMLInputElement; const files = Array.from(input.files || []); input.value = ''; emit('upload', props.node, files) }
function directoryValue(key: string) { const value = values[key]; return Array.isArray(value) ? value as string[] : typeof value === 'string' && value ? [value] : [] }
function setDirectory(key: string, value: string[], multiple: boolean) { values[key] = multiple ? value : value.at(-1) || '' }
</script>
<style scoped>
.ui-layout, .ui-form { display: flex; flex-direction: column; align-items: stretch; gap: var(--md-space-4); min-width: 0; }
.ui-layout > h4 { margin: 0; font: var(--md-sys-typescale-title-small); }
.ui-row { flex-direction: row; flex-wrap: wrap; }
.ui-row > * { flex: 1; min-width: 140px; }
.ui-card, .ui-metric { padding: var(--md-space-4); border-radius: var(--md-sys-shape-corner-large); background: var(--app-inset); }
.ui-metric { display: grid; gap: var(--md-space-2); }
.ui-metric strong { font: var(--md-sys-typescale-headline-small); }
.ui-text, pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.ui-text { color: var(--md-sys-color-on-surface-variant); font: var(--md-sys-typescale-body-medium); }
.ui-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--md-space-3); margin: 0; }
.ui-filter { display: grid; gap: var(--md-space-2); flex: 1 1 150px; min-width: 0; }
.ui-filter label { font: var(--md-sys-typescale-label-medium); color: var(--md-sys-color-on-surface-variant); }
.ui-filter :deep(.el-select), .ui-filter :deep(.el-input) { width: 100%; }
.ui-filter-submit { flex: 0 0 auto; }
.ui-upload { display: flex; flex-wrap: wrap; align-items: center; gap: var(--md-space-3); }
.ui-upload > button { flex: 0 0 auto; }
.ui-upload input[hidden] { display: none; }
.ui-upload small { font: var(--md-sys-typescale-body-small); }
.ui-items { display: grid; align-items: start; gap: var(--md-space-4); }
.ui-items.gallery { grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr)); }
.ui-item { min-width: 0; overflow: hidden; border: 1px solid var(--md-sys-color-outline-variant); border-radius: var(--md-sys-shape-corner-large); background: var(--app-card); }
.ui-item-media { display: flex; justify-content: center; align-items: center; aspect-ratio: 4 / 3; overflow: hidden; background: var(--md-sys-color-surface-container); }
.ui-item-media :deep(img) { display: block; width: 100%; height: 100%; object-fit: contain; }
.ui-item-media :deep(span) { padding: var(--md-space-3); font: var(--md-sys-typescale-body-small); }
.ui-item-body { display: flex; flex-direction: column; gap: var(--md-space-2); padding: var(--md-space-3); overflow-wrap: anywhere; }
.ui-item-title { margin: 0; font: var(--md-sys-typescale-title-small); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ui-item-description { margin: 0; font: var(--md-sys-typescale-body-small); color: var(--md-sys-color-on-surface-variant); }
.ui-item-meta { font: var(--md-sys-typescale-label-small); }
.ui-tags { display: flex; flex-wrap: wrap; gap: var(--md-space-1); }
.ui-tags span { padding: 2px var(--md-space-2); border-radius: var(--md-sys-shape-corner-small); background: var(--app-inset); font: var(--md-sys-typescale-label-small); }
.ui-item-actions { display: flex; flex-wrap: wrap; gap: var(--md-space-1); margin-top: var(--md-space-1); }
.ui-item-actions .md-button { margin-left: calc(-1 * var(--md-space-2)); }
.ui-items.list .ui-item { display: flex; align-items: flex-start; }
.ui-items.list .ui-item-media { width: 120px; flex: 0 0 120px; }
.ui-items.list .ui-item-body { flex: 1; min-width: 0; }
.ui-table { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
td, th { padding: var(--md-space-3); text-align: left; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
.ui-pager { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: var(--md-space-2); font: var(--md-sys-typescale-body-small); }
.ui-form > label { display: flex; flex-direction: column; gap: var(--md-space-2); font: var(--md-sys-typescale-label-medium); }
.ui-form > button { align-self: flex-start; }
.ui-form input, .ui-form textarea, .ui-form select { min-width: 0; font: inherit; color: inherit; background: var(--app-card); border: 1px solid var(--md-sys-color-outline-variant); border-radius: var(--md-sys-shape-corner-small); padding: var(--md-space-3); }
.ui-form input:focus-visible, .ui-form textarea:focus-visible, .ui-form select:focus-visible { outline: 2px solid var(--md-sys-color-primary); outline-offset: 1px; }
.ui-form input[type='checkbox'] { width: fit-content; }
.ui-notice, .ui-empty { margin: 0; padding: var(--md-space-3); background: var(--app-inset); border-radius: var(--md-sys-shape-corner-medium); }
.ui-error, .danger { color: var(--md-sys-color-error); }
small { color: var(--md-sys-color-on-surface-variant); }
</style>
