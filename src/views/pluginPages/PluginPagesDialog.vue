<template>
  <el-dialog :model-value="visible" :title="`${pluginName} · 页面`" width="min(1120px, 95vw)" append-to-body
    @update:model-value="emit('update:visible', $event)">
    <div class="plugin-pages">
      <p v-if="error" role="alert" class="page-error">{{ error }}</p>
      <p v-if="loadingPages" role="status">正在读取页面…</p>
      <p v-else-if="!pages.length && !error">这个插件没有提供独立页面。</p>
      <template v-else-if="pages.length">
        <nav class="page-tabs" aria-label="插件页面">
          <button v-for="entry in pages" :key="entry.id" type="button" class="md-button toggle"
            :class="{ selected: selectedId === entry.id }" :aria-pressed="selectedId === entry.id" :disabled="Boolean(running)"
            @click="selectPage(entry.id)"><MdIcon :name="entry.icon || 'dashboard'" />{{ entry.title }}</button>
        </nav>
        <template v-if="selected">
          <p v-if="selected.description">{{ selected.description }}</p>
          <form class="page-filters" @submit.prevent="page = 1; void loadData()">
            <label v-for="filter in selected.filters" :key="filter.key">
              <span>{{ filter.label }}</span>
              <select v-if="filter.type === 'select'" v-model="filters[filter.key]" :disabled="Boolean(running)">
                <option value="">全部</option>
                <option v-for="option in filter.options" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <input v-else v-model="filters[filter.key]" type="search" :disabled="Boolean(running)" />
            </label>
            <button type="submit" class="md-button tonal" :disabled="loading || Boolean(running)"><MdIcon name="refresh" />刷新</button>
          </form>
          <p v-if="loading" role="status">正在加载…</p>
          <template v-else-if="data">
            <div v-if="selected.kind === 'stats'" class="page-metrics">
              <article v-for="metric in data.metrics" :key="metric.label"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong><small>{{ metric.hint }}</small></article>
            </div>
            <template v-else-if="['gallery', 'list', 'table'].includes(selected.kind)">
              <p v-if="!data.items.length">没有匹配的条目。</p>
              <div v-else-if="selected.kind === 'table'" class="page-table-wrap">
                <table><thead><tr><th>条目</th><th v-for="column in selected.columns" :key="column.key">{{ column.label }}</th><th>操作</th></tr></thead>
                  <tbody><tr v-for="item in data.items" :key="item.id"><td>{{ item.title }}</td><td v-for="column in selected.columns" :key="column.key">{{ item.values[column.key] }}</td>
                    <td><button v-for="action in itemActions(item)" :key="action.id" type="button" class="md-button text compact"
                      :class="{ danger: action.tone === 'danger' }" :disabled="Boolean(running)" @click="execute(item, action)">{{ action.label }}</button></td>
                  </tr></tbody></table>
              </div>
              <div v-else :class="['page-items', selected.kind]">
                <article v-for="item in data.items" :key="item.id" class="page-item">
                  <img v-if="images[item.id]" :src="images[item.id]" :alt="item.title" loading="lazy" />
                  <span v-else-if="item.image" class="image-placeholder">{{ imageErrors[item.id] ? '图片加载失败' : '图片加载中…' }}</span>
                  <div class="item-body"><strong>{{ item.title }}</strong><p v-if="item.description">{{ item.description }}</p>
                    <p v-if="item.tags.length" class="item-tags">{{ item.tags.join(' · ') }}</p><small>{{ item.meta }}</small>
                    <div class="button-group"><button v-for="action in itemActions(item)" :key="action.id" type="button" class="md-button text compact"
                      :class="{ danger: action.tone === 'danger' }" :disabled="Boolean(running)" @click="execute(item, action)">{{ running === `${item.id}:${action.id}` ? '执行中…' : action.label }}</button></div>
                  </div>
                </article>
              </div>
            </template>
            <p v-else>当前 Dashboard 不支持这种页面类型：{{ selected.kind }}</p>
            <footer v-if="selected.page_size > 0 && selected.kind !== 'stats'" class="page-pager">
              <button type="button" class="md-button text" :disabled="page <= 1 || Boolean(running)" @click="page--; void loadData()">上一页</button>
              <span>第 {{ page }} 页<span v-if="data.total != null"> · 共 {{ data.total }} 条</span></span>
              <button type="button" class="md-button text" :disabled="!data.has_more || Boolean(running)" @click="page++; void loadData()">下一页</button>
            </footer>
          </template>
        </template>
      </template>
    </div>
    <template #footer><button type="button" class="md-button tonal" @click="emit('update:visible', false)">关闭</button></template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MdIcon from '../../components/MdIcon.vue'
import { getApiErrorMessage, getPluginPages, getPluginPageData, getPluginPageImage, runPluginPageAction,
  type PluginPage, type PluginPageData, type PluginPageItem } from '../../api'

const props = defineProps<{ visible: boolean; pluginId: string; pluginName: string }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()
const pages = ref<PluginPage[]>([])
const selectedId = ref('')
const selected = computed(() => pages.value.find(entry => entry.id === selectedId.value))
const filters = ref<Record<string, string>>({})
const data = ref<PluginPageData | null>(null)
const page = ref(1)
const loading = ref(false)
const loadingPages = ref(false)
const error = ref('')
const running = ref('')
const images = ref<Record<string, string>>({})
const imageErrors = ref<Record<string, boolean>>({})
let lifetime = new AbortController()
let request: AbortController | undefined
let actionRequest: AbortController | undefined

function clearImages() {
  Object.values(images.value).forEach(url => URL.revokeObjectURL(url))
  images.value = {}; imageErrors.value = {}
}
function stop() {
  lifetime.abort(); request?.abort(); actionRequest?.abort(); clearImages()
  loading.value = false; loadingPages.value = false; running.value = ''
}
watch(() => [props.visible, props.pluginId], async () => {
  stop(); pages.value = []; selectedId.value = ''; data.value = null; error.value = ''
  if (!props.visible || !props.pluginId) return
  lifetime = new AbortController()
  const signal = lifetime.signal
  loadingPages.value = true
  try {
    const result = await getPluginPages(props.pluginId, signal)
    if (signal.aborted) return
    pages.value = result.pages ?? []
    if (pages.value[0]) selectPage(pages.value[0].id)
  } catch (cause) {
    if (!signal.aborted) error.value = getApiErrorMessage(cause, '无法读取插件页面，请确认宿主支持此功能。')
  } finally { if (!signal.aborted) loadingPages.value = false }
}, { immediate: true })

function selectPage(id: string) {
  selectedId.value = id; page.value = 1; filters.value = {}; void loadData()
}
async function loadData() {
  request?.abort(); clearImages(); data.value = null
  if (!selected.value || !props.visible) return
  const controller = request = new AbortController()
  const pluginId = props.pluginId, pageId = selected.value.id
  loading.value = true; error.value = ''
  try {
    const result = await getPluginPageData(pluginId, pageId, page.value, selected.value.page_size, filters.value, controller.signal)
    if (controller.signal.aborted) return
    data.value = result
    void loadImages(result.items, pluginId, pageId, controller.signal)
  } catch (cause) {
    if (!controller.signal.aborted) error.value = getApiErrorMessage(cause, '页面加载失败。')
  } finally { if (!controller.signal.aborted) loading.value = false }
}
async function loadImages(items: PluginPageItem[], pluginId: string, pageId: string, signal: AbortSignal) {
  const pending = items.filter(item => item.image)
  async function worker() {
    while (pending.length && !signal.aborted) {
      const item = pending.shift()!
      try {
        const blob = await getPluginPageImage(pluginId, pageId, item.image!, signal)
        if (signal.aborted) return
        if (!blob.type.startsWith('image/')) throw new Error('非图片文件')
        images.value[item.id] = URL.createObjectURL(blob)
      } catch { if (!signal.aborted) imageErrors.value[item.id] = true }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
}
function itemActions(item: PluginPageItem) {
  return selected.value?.actions.filter(action => item.actions.some(id => id.toLowerCase() === action.id.toLowerCase())) ?? []
}
async function execute(item: PluginPageItem, action: PluginPage['actions'][number]) {
  if (running.value || !selected.value || !props.visible) return
  const pluginId = props.pluginId, pageId = selected.value.id, signal = lifetime.signal
  running.value = `${item.id}:${action.id}`
  try {
    if (action.confirm) {
      try { await ElMessageBox.confirm(action.confirm, action.label, { type: action.tone === 'danger' ? 'warning' : 'info' }) }
      catch { return }
    }
    if (signal.aborted || !props.visible) return
    const controller = actionRequest = new AbortController()
    const result = await runPluginPageAction(pluginId, pageId, action.id, item.id, controller.signal)
    if (signal.aborted) return
    if (result.details) await ElMessageBox.alert(result.details, result.title || action.label, { customClass: 'plugin-action-details' })
    else if (result.message) ElMessage({ message: result.message, type: result.ok ? 'success' : 'warning' })
    if (result.refresh && !signal.aborted) await loadData()
  } catch (cause) {
    if (!signal.aborted) ElMessage.error(getApiErrorMessage(cause, '操作失败。'))
  } finally { if (!signal.aborted) running.value = '' }
}
onBeforeUnmount(stop)
</script>

<style scoped>
.plugin-pages { min-height: 160px; }
.page-tabs, .page-filters, .page-pager { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.page-tabs { margin-bottom: 16px; }
.page-filters { margin: 20px 0; align-items: end; }
.page-filters label { display: grid; gap: 6px; flex: 1; min-width: 130px; }
.page-filters input, .page-filters select { font: inherit; color: inherit; background: var(--md-sys-color-surface); padding: 9px 12px; border: 1px solid var(--md-sys-color-outline-variant); border-radius: 10px; }
.page-error { color: var(--md-sys-color-error); }
.page-items.gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.page-items.list { display: grid; gap: 12px; }
.page-item { border: 1px solid var(--md-sys-color-outline-variant); border-radius: 16px; overflow: hidden; }
.page-items.list .page-item { display: flex; align-items: center; }
.page-item img, .image-placeholder { display: block; width: 100%; height: 180px; object-fit: contain; background: var(--md-sys-color-surface-container); }
.page-items.list img, .page-items.list .image-placeholder { width: 120px; flex-shrink: 0; }
.item-body { padding: 14px; overflow-wrap: anywhere; }
.item-body p { margin: 8px 0; }
.item-tags, .item-body small { color: var(--md-sys-color-on-surface-variant); }
.page-pager { justify-content: center; margin-top: 20px; }
.page-table-wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--md-sys-color-outline-variant); }
.page-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.page-metrics article { display: grid; gap: 8px; padding: 20px; border-radius: 16px; background: var(--md-sys-color-surface-container); }
.page-metrics strong { font-size: 28px; }
</style>
