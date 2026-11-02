<template>
  <section class="plugin-pages">
    <h3 class="page-title">{{ selected.title }}</h3>
    <p v-if="error" role="alert" class="page-error">{{ error }}</p>
    <div v-if="selected.upload" class="page-upload">
      <input ref="fileInput" type="file" hidden multiple :accept="selected.upload.content_types.join(',')" :disabled="busy" @change="uploadImages" />
      <button type="button" class="md-button tonal" :disabled="busy" @click="fileInput?.click()"><MdIcon name="upload" />{{ selected.upload.label }}</button>
      <button v-if="uploading" type="button" class="md-button text" @click="cancelUpload">取消上传</button>
      <span v-if="uploading" role="status" aria-live="polite">{{ uploading }}</span>
      <small v-else>{{ selected.upload.description }} 单文件上限 {{ (selected.upload.max_bytes / 1000000).toFixed(1) }} MB。</small>
    </div>
          <p v-if="selected.description">{{ selected.description }}</p>
          <form class="page-filters" @submit.prevent="page = 1; void loadData()">
            <label v-for="filter in selected.filters" :key="filter.key">
              <span>{{ filter.label }}</span>
              <select v-if="filter.type === 'select'" v-model="filters[filter.key]" :disabled="busy">
                <option value="">全部</option>
                <option v-for="option in filter.options" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <input v-else v-model="filters[filter.key]" type="search" :disabled="busy" />
            </label>
            <button type="submit" class="md-button tonal" :disabled="loading || busy"><MdIcon name="refresh" />刷新</button>
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
                      :class="{ danger: action.tone === 'danger' }" :disabled="busy" @click="execute(item, action)">{{ action.label }}</button></td>
                  </tr></tbody></table>
              </div>
              <div v-else :class="['page-items', selected.kind]">
                <article v-for="item in data.items" :key="item.id" class="page-item">
                  <img v-if="images[item.id]" :src="images[item.id]" :alt="item.title" loading="lazy" />
                  <span v-else-if="item.image" class="image-placeholder">{{ imageErrors[item.id] ? '图片加载失败' : '图片加载中…' }}</span>
                  <div class="item-body"><strong>{{ item.title }}</strong><p v-if="item.description">{{ item.description }}</p>
                    <p v-if="item.tags.length" class="item-tags">{{ item.tags.join(' · ') }}</p><small>{{ item.meta }}</small>
                    <div class="button-group"><button v-for="action in itemActions(item)" :key="action.id" type="button" class="md-button text compact"
                      :class="{ danger: action.tone === 'danger' }" :disabled="busy" @click="execute(item, action)">{{ running === `${item.id}:${action.id}` ? '执行中…' : action.label }}</button></div>
                  </div>
                </article>
              </div>
            </template>
            <p v-else>当前 Dashboard 不支持这种页面类型：{{ selected.kind }}</p>
            <footer v-if="selected.page_size > 0 && selected.kind !== 'stats'" class="page-pager">
              <button type="button" class="md-button text" :disabled="page <= 1 || busy" @click="page--; void loadData()">上一页</button>
              <span>第 {{ page }} 页<span v-if="data.total != null"> · 共 {{ data.total }} 条</span></span>
              <button type="button" class="md-button text" :disabled="!data.has_more || busy" @click="page++; void loadData()">下一页</button>
            </footer>
          </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MdIcon from '../../components/MdIcon.vue'
import { getApiErrorMessage, getPluginPageData, getPluginPageImage, runPluginPageAction, uploadPluginPageFile,
  type PluginPage, type PluginPageData, type PluginPageItem } from '../../api'

const props = defineProps<{ pluginId: string; definition: PluginPage }>()
const selected = computed(() => props.definition)
const filters = ref<Record<string, string>>({})
const data = ref<PluginPageData | null>(null)
const page = ref(1)
const loading = ref(false)
const error = ref('')
const running = ref('')
const uploading = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const busy = computed(() => Boolean(running.value || uploading.value))
const images = ref<Record<string, string>>({})
const imageErrors = ref<Record<string, boolean>>({})
let lifetime = new AbortController()
let request: AbortController | undefined
let actionRequest: AbortController | undefined
let uploadRequest: AbortController | undefined

function clearImages() {
  Object.values(images.value).forEach(url => URL.revokeObjectURL(url))
  images.value = {}; imageErrors.value = {}
}
function stop() {
  lifetime.abort(); request?.abort(); actionRequest?.abort(); uploadRequest?.abort(); clearImages()
  loading.value = false; running.value = ''; uploading.value = ''
}
watch(() => [props.pluginId, props.definition.id], () => {
  stop(); lifetime = new AbortController(); page.value = 1; filters.value = {}; error.value = ''
  void loadData()
}, { immediate: true })

async function loadData() {
  request?.abort(); clearImages(); data.value = null
  if (!selected.value) return
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
  if (busy.value || !selected.value) return
  const pluginId = props.pluginId, pageId = selected.value.id, signal = lifetime.signal
  running.value = `${item.id}:${action.id}`
  try {
    if (action.confirm) {
      try { await ElMessageBox.confirm(action.confirm, action.label, { type: action.tone === 'danger' ? 'warning' : 'info' }) }
      catch { return }
    }
    if (signal.aborted) return
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
function cancelUpload() { uploadRequest?.abort() }
async function uploadImages(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  const descriptor = selected.value.upload
  if (!files.length || !descriptor || busy.value) return
  const controller = uploadRequest = new AbortController()
  const signal = lifetime.signal, pluginId = props.pluginId, pageId = selected.value.id
  let succeeded = 0
  const failures: string[] = []
  try {
    for (const [index, file] of files.entries()) {
      if (controller.signal.aborted || signal.aborted) break
      uploading.value = `正在上传并处理 ${index + 1}/${files.length}：${file.name}`
      if (file.size === 0 || file.size > descriptor.max_bytes) {
        failures.push(`${file.name}：文件为空或超过大小上限`); continue
      }
      try {
        const result = await uploadPluginPageFile(pluginId, pageId, file, controller.signal)
        if (signal.aborted) return
        if (result.ok) succeeded++
        else failures.push(`${file.name}：${result.message}`)
      } catch (cause) {
        if (controller.signal.aborted || signal.aborted) break
        failures.push(`${file.name}：${getApiErrorMessage(cause, '上传失败')}`)
      }
    }
    if (signal.aborted) return
    if (succeeded || controller.signal.aborted) {
      page.value = 1; filters.value = {}; await loadData()
    }
    if (signal.aborted) return
    const summary = `${controller.signal.aborted ? '已取消上传；' : ''}已处理 ${succeeded} 张图片${failures.length ? `，${failures.length} 张失败：${failures.slice(0, 2).join('；')}` : ''}`
    ElMessage({ message: summary, type: failures.length || controller.signal.aborted ? 'warning' : 'success', duration: failures.length ? 8000 : 3000 })
  } finally { if (!signal.aborted) uploading.value = '' }
}
onBeforeUnmount(stop)
</script>

<style scoped>
.plugin-pages { min-height: 160px; }
.page-title { margin: 0 0 var(--md-space-3); font: var(--md-sys-typescale-title-medium); font-weight: 700; }
.page-filters, .page-pager { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.page-upload { display: flex; align-items: center; flex-wrap: wrap; gap: var(--md-space-3); margin: var(--md-space-3) 0; }
.page-upload small { color: var(--md-sys-color-on-surface-variant); }
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
