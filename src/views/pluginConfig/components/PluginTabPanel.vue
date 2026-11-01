<template>
  <div class="plugin-tab-panel">
    <p v-if="tab.description" class="tab-description">{{ tab.description }}</p>

    <form v-if="isDataTab && tab.filters?.length" class="tab-filters" @submit.prevent="applyFilters">
      <label v-for="filter in tab.filters" :key="filter.key" class="tab-filter">
        <span>{{ filter.label }}</span>
        <select v-if="filter.type === 'select'" v-model="filters[filter.key]">
          <option value="">全部</option>
          <option v-for="option in filter.options ?? []" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <input v-else v-model="filters[filter.key]" :placeholder="filter.label" />
      </label>
      <button type="submit" class="md-button tonal compact">筛选</button>
    </form>

    <div v-if="isDataTab" class="tab-toolbar">
      <span>{{ loading ? '正在加载…' : `共 ${total} 项` }}</span>
      <button type="button" class="md-button text compact" :disabled="loading" @click="load">
        <MdIcon name="refresh" />刷新
      </button>
    </div>

    <p v-if="error" class="tab-error">{{ error }}</p>
    <div v-else-if="loading" class="tab-empty">正在加载…</div>

    <div v-else-if="tab.kind === 'gallery'" class="tab-gallery">
      <article v-for="item in items" :key="item.id" class="gallery-card">
        <img v-if="imageFor(item)" class="gallery-image" :src="imageFor(item)" :alt="titleFor(item)" loading="lazy" />
        <div class="gallery-body">
          <strong>{{ titleFor(item) }}</strong>
          <p v-if="descriptionFor(item)" class="gallery-description">{{ descriptionFor(item) }}</p>
          <div v-if="tagsFor(item).length" class="gallery-tags">
            <span v-for="tag in tagsFor(item)" :key="tag">{{ tag }}</span>
          </div>
          <div v-if="itemActions(item).length" class="gallery-actions">
            <button
              v-for="action in itemActions(item)"
              :key="action.id"
              type="button"
              class="md-button text compact"
              :class="{ danger: action.tone === 'danger' }"
              @click="runAction(action, item)"
            >{{ action.label }}</button>
          </div>
        </div>
      </article>
      <p v-if="!items.length" class="tab-empty">暂无数据。</p>
    </div>

    <div v-else-if="tab.kind === 'table'" class="tab-table-wrap">
      <table class="tab-table">
        <thead>
          <tr>
            <th v-for="column in tab.columns ?? []" :key="column.key">{{ column.label }}</th>
            <th v-if="tab.actions?.length">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td v-for="column in tab.columns ?? []" :key="column.key">{{ cellValue(item, column.key) }}</td>
            <td v-if="tab.actions?.length">
              <button
                v-for="action in itemActions(item)"
                :key="action.id"
                type="button"
                class="md-button text compact"
                :class="{ danger: action.tone === 'danger' }"
                @click="runAction(action, item)"
              >{{ action.label }}</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!items.length" class="tab-empty">暂无数据。</p>
    </div>

    <div v-else-if="tab.kind === 'list'" class="tab-list">
      <article v-for="item in items" :key="item.id" class="list-card">
        <div>
          <strong>{{ titleFor(item) }}</strong>
          <p v-if="descriptionFor(item)">{{ descriptionFor(item) }}</p>
          <small v-if="metaFor(item)">{{ metaFor(item) }}</small>
        </div>
        <div v-if="itemActions(item).length" class="list-actions">
          <button
            v-for="action in itemActions(item)"
            :key="action.id"
            type="button"
            class="md-button text compact"
            :class="{ danger: action.tone === 'danger' }"
            @click="runAction(action, item)"
          >{{ action.label }}</button>
        </div>
      </article>
      <p v-if="!items.length" class="tab-empty">暂无数据。</p>
    </div>

    <div v-else-if="tab.kind === 'stats'" class="tab-stats">
      <div v-for="metric in metrics" :key="metric.label" class="stat-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small v-if="metric.hint">{{ metric.hint }}</small>
      </div>
      <p v-if="!metrics.length" class="tab-empty">暂无统计数据。</p>
    </div>

    <div v-else-if="tab.kind === 'link'" class="tab-link">
      <a v-if="tab.source?.path" class="md-button filled" :href="tab.source.path" target="_blank" rel="noopener">
        <MdIcon name="open_in_new" />打开页面
      </a>
      <p v-else class="tab-error">未配置页面地址。</p>
    </div>

    <iframe
      v-else-if="tab.kind === 'iframe' && tab.source?.path"
      class="tab-iframe"
      :src="tab.source.path"
      :title="tab.label"
      loading="lazy"
    />

    <p v-else class="tab-error">不支持的 tab 类型：{{ tab.kind }}</p>

    <div v-if="isDataTab && tab.pagination && (page > 1 || hasMore)" class="tab-pagination">
      <button type="button" class="md-button tonal compact" :disabled="page <= 1 || loading" @click="previousPage">上一页</button>
      <span>第 {{ page }} 页</span>
      <button type="button" class="md-button tonal compact" :disabled="!hasMore || loading" @click="nextPage">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MdIcon from '../../../components/MdIcon.vue'
import type { PluginDashboardTab, PluginDashboardTabAction } from '../../../api'

interface TabItem {
  id: string
  title?: string | null
  description?: string | null
  image?: string | null
  tags?: string[] | null
  values?: Record<string, unknown> | null
  actions?: string[] | null
}

interface TabMetric {
  label: string
  value: string
  hint?: string | null
}

interface TabResponse {
  items?: TabItem[]
  metrics?: TabMetric[]
  total?: number
  page?: number
  page_size?: number
  has_more?: boolean
}

const props = defineProps<{ tab: PluginDashboardTab }>()

const loading = ref(false)
const error = ref('')
const items = ref<TabItem[]>([])
const metrics = ref<TabMetric[]>([])
const total = ref(0)
const page = ref(1)
const hasMore = ref(false)
const filters = reactive<Record<string, string>>({})

const isDataTab = computed(() => ['gallery', 'table', 'list', 'stats'].includes(props.tab.kind))
const pageSize = computed(() => props.tab.pagination?.page_size ?? 24)
const pageParameter = computed(() => props.tab.pagination?.page_param ?? 'page')
const pageSizeParameter = computed(() => props.tab.pagination?.page_size_param ?? 'page_size')

function resetFilters() {
  Object.keys(filters).forEach(key => delete filters[key])
  for (const filter of props.tab.filters ?? []) filters[filter.key] = ''
  page.value = 1
  hasMore.value = false
}

function applyFilters() {
  page.value = 1
  void load()
}

async function load() {
  if (!isDataTab.value) return
  const path = props.tab.source?.path
  if (!path) {
    error.value = '未配置数据地址。'
    return
  }

  loading.value = true
  error.value = ''
  try {
    const url = new URL(path, window.location.origin)
    if (props.tab.kind !== 'stats') {
      url.searchParams.set(pageParameter.value, String(page.value))
      url.searchParams.set(pageSizeParameter.value, String(pageSize.value))
    }
    for (const [key, value] of Object.entries(filters)) {
      if (value.trim()) url.searchParams.set(key, value.trim())
    }

    const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json() as TabResponse
    items.value = Array.isArray(data.items) ? data.items : []
    metrics.value = Array.isArray(data.metrics) ? data.metrics : []
    total.value = typeof data.total === 'number' ? data.total : items.value.length
    hasMore.value = data.has_more === true
    if (typeof data.page === 'number') page.value = data.page
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
    items.value = []
    metrics.value = []
    total.value = 0
    hasMore.value = false
  } finally {
    loading.value = false
  }
}

function previousPage() {
  if (page.value <= 1) return
  page.value -= 1
  void load()
}

function nextPage() {
  if (!hasMore.value) return
  page.value += 1
  void load()
}

function field(item: TabItem, key?: string | null): unknown {
  if (!key) return undefined
  if (Object.prototype.hasOwnProperty.call(item, key)) return (item as unknown as Record<string, unknown>)[key]
  return item.values?.[key]
}

function titleFor(item: TabItem): string {
  return String(field(item, props.tab.fields?.title ?? 'title') ?? '未命名')
}

function descriptionFor(item: TabItem): string {
  const value = field(item, props.tab.fields?.description ?? 'description')
  return value == null ? '' : String(value)
}

function imageFor(item: TabItem): string {
  const value = field(item, props.tab.fields?.image ?? 'image')
  return typeof value === 'string' ? value : ''
}

function tagsFor(item: TabItem): string[] {
  const value = field(item, props.tab.fields?.tags ?? 'tags')
  return Array.isArray(value) ? value.map(String) : []
}

function metaFor(item: TabItem): string {
  const value = field(item, props.tab.fields?.meta ?? 'meta')
  return value == null ? '' : String(value)
}

function cellValue(item: TabItem, key: string): string {
  const value = item.values?.[key] ?? (item as unknown as Record<string, unknown>)[key]
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function itemActions(item: TabItem): PluginDashboardTabAction[] {
  const ids = item.actions
  if (!ids?.length) return []
  return (props.tab.actions ?? []).filter(action => ids.includes(action.id))
}

async function runAction(action: PluginDashboardTabAction, item: TabItem) {
  if (action.confirm) {
    try {
      await ElMessageBox.confirm(action.confirm, action.label, { type: 'warning' })
    } catch {
      return
    }
  }

  const path = action.path.replaceAll('{id}', encodeURIComponent(item.id))
  try {
    const response = await fetch(path, {
      method: action.method || 'POST',
      headers: { Accept: 'application/json' }
    })
    const data = await response.json().catch(() => ({})) as { ok?: boolean; message?: string }
    if (!response.ok || data.ok === false) throw new Error(data.message || `HTTP ${response.status}`)
    ElMessage.success(data.message || '已完成')
    await load()
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : String(cause))
  }
}

watch(() => props.tab, () => {
  resetFilters()
  items.value = []
  metrics.value = []
  total.value = 0
  void load()
}, { immediate: true })
</script>

<style scoped>
.plugin-tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--md-space-4);
}

.tab-description {
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium);
}

.tab-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--md-space-3);
}

.tab-filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 130px;
  font: var(--md-sys-typescale-label-small);
  color: var(--md-sys-color-on-surface-variant);
}

.tab-filter input,
.tab-filter select {
  min-height: 36px;
  padding: 0 var(--md-space-3);
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--md-sys-color-surface);
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-body-medium);
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--md-space-3);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium);
}

.tab-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--md-space-3);
}

.gallery-card {
  overflow: hidden;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-low);
}

.gallery-image {
  display: block;
  width: 100%;
  height: 150px;
  object-fit: contain;
  background: repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 50% / 20px 20px;
}

.gallery-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--md-space-3);
}

.gallery-description {
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.gallery-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.gallery-tags span {
  padding: 1px 6px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  font: var(--md-sys-typescale-label-small);
}

.gallery-actions,
.list-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tab-table-wrap {
  overflow-x: auto;
}

.tab-table {
  width: 100%;
  border-collapse: collapse;
  font: var(--md-sys-typescale-body-small);
}

.tab-table th,
.tab-table td {
  padding: var(--md-space-2) var(--md-space-3);
  border-bottom: 1px solid var(--md-sys-color-outline-variant);
  text-align: left;
}

.tab-table th {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium);
}

.tab-list {
  display: flex;
  flex-direction: column;
  gap: var(--md-space-2);
}

.list-card {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--md-space-3);
  padding: var(--md-space-3);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-low);
}

.list-card p {
  margin: 4px 0;
  color: var(--md-sys-color-on-surface-variant);
}

.list-card small {
  color: var(--md-sys-color-on-surface-variant);
}

.tab-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--md-space-3);
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--md-space-4);
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-low);
}

.stat-card span,
.stat-card small {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-small);
}

.stat-card strong {
  font: var(--md-sys-typescale-headline-small);
}

.tab-link {
  padding: var(--md-space-4) 0;
}

.tab-iframe {
  width: 100%;
  min-height: 70vh;
  border: 0;
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface);
}

.tab-empty {
  padding: var(--md-space-6) 0;
  color: var(--md-sys-color-on-surface-variant);
  text-align: center;
}

.tab-error {
  color: var(--md-sys-color-error);
  font: var(--md-sys-typescale-body-medium);
}

.tab-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--md-space-3);
  color: var(--md-sys-color-on-surface-variant);
}
</style>
