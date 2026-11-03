<template>
  <WebPagePanel v-if="webPage" :plugin-id="pluginId" :definition="webPage" />
  <section v-else class="component-page">
    <div class="page-toolbar"><h3>{{ activeTitle }}</h3><button type="button" class="md-button text compact" :disabled="busy" @click="load">刷新</button></div>
    <p v-if="error" role="alert">{{ error }}</p><p v-if="message" role="status">{{ message }}</p>
    <p v-if="loading">正在加载页面…</p>
    <div v-if="uploadStatus" role="status">{{ uploadStatus }} <button class="md-button text" type="button" @click="request?.abort()">取消上传</button></div>
    <UiRenderer v-if="view" :node="view" :state="state" :plugin-id="pluginId" :page-id="activePage" :busy="busy" :pager-reset="pagerReset" :errors="fieldErrors" @state="changeState" @event="runEvent" @upload="upload" @navigate="navigate" />
    <el-dialog v-model="dialogVisible" :title="dialogForm?.title || '填写表单'" width="min(600px, 94vw)" append-to-body :close-on-click-modal="!busy" :close-on-press-escape="!busy" :show-close="!busy">
      <UiRenderer v-if="dialogForm" :key="dialogKey" :node="dialogForm" :state="state" :plugin-id="pluginId" :page-id="activePage" :busy="busy" :pager-reset="pagerReset" :errors="fieldErrors" :initial-values="dialogValues" dialog @event="runEvent" />
    </el-dialog>
  </section>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessageBox } from 'element-plus'
import { ApiError, getApiErrorMessage } from '../../api/core/http'
import { getPluginPages, renderPluginPage, sendPluginPageEvent, uploadPluginPageElement, type PluginPage, type UiNode, type PageState, type PageEvent, type PageEventResponse } from '../../api/plugins/pages'
import UiRenderer from './UiRenderer.vue'
import WebPagePanel from './WebPagePanel.vue'
const props = defineProps<{ pluginId: string; definition: PluginPage }>()
const activePage = ref(''), activeTitle = ref(''), state = ref<PageState>({}), view = ref<UiNode | null>(null)
const webPage = ref<PluginPage>()
const loading = ref(false), busy = ref(false), error = ref(''), message = ref(''), uploadStatus = ref('')
const fieldErrors = ref<Record<string, string>>({}), dialogVisible = ref(false), dialogForm = ref<UiNode>(), dialogValues = ref<Record<string, unknown>>({}), dialogKey = ref(0)
let request: AbortController | undefined
function nodes(node: UiNode | null): UiNode[] { return node ? [node, ...(node.children || []).flatMap(nodes), ...(node.tabs || []).flatMap(t => t.children.flatMap(nodes))] : [] }
const pagerReset = computed(() => Object.fromEntries(nodes(view.value).filter(n => n.type === 'pager' && n.id).map(n => [n.id!, '1'])))
function begin() { request?.abort(); const controller = request = new AbortController(); busy.value = true; error.value = ''; fieldErrors.value = {}; return controller }
function finish(controller: AbortController) { if (request === controller) { busy.value = false; loading.value = false; uploadStatus.value = '' } }
function failure(cause: unknown, controller: AbortController) {
  if (controller.signal.aborted) return
  error.value = getApiErrorMessage(cause, '页面操作失败。')
  if (cause instanceof ApiError && cause.body && typeof cause.body === 'object' && 'fields' in cause.body) fieldErrors.value = cause.body.fields as Record<string, string>
}
async function load() {
  const controller = begin(); loading.value = true
  try { const response = await renderPluginPage(props.pluginId, activePage.value, state.value, controller.signal); if (!controller.signal.aborted) { view.value = response.view; state.value = response.state } }
  catch (cause) { failure(cause, controller) } finally { finish(controller) }
}
function changeState(patch: PageState) { if (busy.value) return; state.value = { ...state.value, ...patch }; void load() }
async function openPage(id: string, next: PageState, controller: AbortController) {
  const pages = await getPluginPages(props.pluginId, controller.signal)
  const page = pages.pages.find(p => p.id === id)
  if (!page) throw new Error('目标页面不存在。')
  if (controller.signal.aborted) return
  if (page.kind === 'web') { webPage.value = page; dialogVisible.value = false; return }
  const response = await renderPluginPage(props.pluginId, id, next, controller.signal)
  if (controller.signal.aborted) return
  activePage.value = page.id; activeTitle.value = page.title; state.value = response.state; view.value = response.view; dialogVisible.value = false
}
async function navigate(id: string, next: PageState) { if (busy.value) return; const controller = begin(); try { await openPage(id, next, controller) } catch (cause) { failure(cause, controller) } finally { finish(controller) } }
async function apply(response: PageEventResponse, controller: AbortController) {
  if (controller.signal.aborted) return
  state.value = response.state
  if (response.view) view.value = response.view
  message.value = response.result.message || ''
  if (!response.result.ok) error.value = message.value || '操作未完成。'
  if (response.result.details) await ElMessageBox.alert(response.result.details, response.result.details_title || '操作详情', { dangerouslyUseHTMLString: false })
  if (controller.signal.aborted) return
  if (response.result.open_page) await openPage(response.result.open_page.id, response.result.open_page.state || {}, controller)
  if (response.result.open_form) {
    const form = nodes(view.value).find(n => n.type === 'form' && n.dialog && n.id === response.result.open_form!.id)
    if (!form) { error.value = '表单已经变化，请刷新后重试。'; return }
    dialogForm.value = form; dialogValues.value = response.result.open_form.values || {}; dialogKey.value++; dialogVisible.value = true
  }
}
async function runEvent(event: PageEvent, action?: { confirm?: string; label?: string; danger?: boolean }) {
  if (busy.value) return
  const controller = begin()
  try {
    if (action?.confirm) await ElMessageBox.confirm(action.confirm, action.label || '确认操作', { type: action.danger ? 'warning' : 'info', dangerouslyUseHTMLString: false })
    if (controller.signal.aborted) return
    const response = await sendPluginPageEvent(props.pluginId, activePage.value, state.value, event, controller.signal)
    if (!controller.signal.aborted && event.kind === 'submit' && response.result.ok) dialogVisible.value = false
    await apply(response, controller)
  } catch (cause) { if (cause !== 'cancel' && cause !== 'close') failure(cause, controller) } finally { finish(controller) }
}
async function upload(node: UiNode, files: File[]) {
  if (busy.value || !files.length || !node.id) return
  const controller = begin(); const failures: string[] = []; let success = 0
  try {
    for (let i = 0; i < files.length && !controller.signal.aborted; i++) {
      const file = files[i]!; uploadStatus.value = `正在上传 ${i + 1}/${files.length}：${file.name}`
      if (file.size > (node.max_bytes || 20000000)) { failures.push(`${file.name}：文件超过大小限制。`); continue }
      try { const response = await uploadPluginPageElement(props.pluginId, activePage.value, state.value, node.id, file, controller.signal); await apply(response, controller); if (response.result.ok) success++; else failures.push(`${file.name}：${response.result.message || '上传失败'}`) }
      catch (cause) { if (!controller.signal.aborted) failures.push(`${file.name}：${getApiErrorMessage(cause, '上传失败。')}`) }
    }
    if (request === controller) { message.value = `上传完成 ${success}/${files.length}${controller.signal.aborted ? '（已取消）' : ''}`; error.value = failures.join('\n') }
  } finally { finish(controller) }
}
watch(() => [props.pluginId, props.definition.id], () => { request?.abort(); webPage.value = undefined; activePage.value = props.definition.id; activeTitle.value = props.definition.title; state.value = {}; view.value = null; message.value = ''; dialogVisible.value = false; void load() }, { immediate: true })
onBeforeUnmount(() => request?.abort())
</script>
<style scoped>
.component-page { display: flex; flex-direction: column; gap: var(--md-space-4); min-width: 0; }
.component-page > p { margin: 0; }
.page-toolbar h3 { margin: 0; font: var(--md-sys-typescale-title-medium); font-weight: 700; }
.page-toolbar { display: flex; justify-content: space-between; align-items: center; }
p[role='alert'] { color: var(--md-sys-color-error); white-space: pre-wrap; }
</style>
