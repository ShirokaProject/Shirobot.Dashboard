<template>
  <section class="web-page">
    <div class="page-toolbar"><h3>{{ definition.title }}</h3><button type="button" class="md-button text compact" :disabled="loading" @click="load">刷新</button></div>
    <p v-if="definition.description">{{ definition.description }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">正在加载页面…</p>
    <iframe v-if="document" :key="revision" ref="frame" :srcdoc="document" :title="definition.title"
      sandbox="allow-scripts" referrerpolicy="no-referrer" @load="connect" />
  </section>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { callPluginWebPage, getPluginWebAsset, getPluginWebPage, type PluginPage } from '../../api/plugins/pages'
import { getApiErrorMessage } from '../../api/core/http'
import { validWebBridgeMessage, webPageDocument } from './webBridge'

const props = defineProps<{ pluginId: string; definition: PluginPage }>()
const frame = ref<HTMLIFrameElement>(), document = ref(''), loading = ref(false), error = ref(''), revision = ref(0)
let controller: AbortController | undefined, port: MessagePort | undefined, loads = 0, nonce = ''
function close() { controller?.abort(); port?.close(); port = undefined }
async function load() {
  close(); document.value = ''; loads = 0; nonce = crypto.randomUUID(); revision.value++; error.value = ''; loading.value = true
  const request = controller = new AbortController()
  try {
    const result = await getPluginWebPage(props.pluginId, props.definition.id, request.signal)
    if (!request.signal.aborted) document.value = webPageDocument(result.html, nonce)
  } catch (cause) { if (!request.signal.aborted) error.value = getApiErrorMessage(cause, '网页加载失败。') }
  finally { if (controller === request) loading.value = false }
}
function connect(event: Event) {
  const target = event.currentTarget as HTMLIFrameElement
  if (target !== frame.value || !target.contentWindow || !controller || controller.signal.aborted) return
  // A later navigation must never receive a new privileged channel.
  if (++loads !== 1) { close(); document.value = ''; error.value = '页面发生导航，请刷新后重试。'; return }
  const { port1, port2 } = new MessageChannel()
  port = port1
  const request = controller, pluginId = props.pluginId, pageId = props.definition.id
  const inFlight = new Set<number>()
  const expectedNonce = nonce
  let authenticated = false
  port1.onmessage = async ({ data }: MessageEvent<unknown>) => {
    if (!authenticated) {
      if (data && typeof data === 'object' && 'type' in data && data.type === 'ready' && 'nonce' in data && data.nonce === expectedNonce)
        authenticated = true
      else port1.close()
      return
    }
    if (!validWebBridgeMessage(data) || request.signal.aborted || inFlight.has(data.id)) return
    const respond = (message: object, transfer: Transferable[] = []) => {
      if (!request.signal.aborted) port1.postMessage({ id: data.id, ...message }, transfer)
    }
    if (inFlight.size >= 32) { respond({ ok: false, error: '同时进行的网页请求过多。' }); return }
    inFlight.add(data.id)
    try {
      if (data.op === 'call') {
        const json = JSON.stringify(data.arguments ?? null)
        if (new TextEncoder().encode(json).length > 900000) throw new Error('网页请求超过大小限制。')
        const result = await callPluginWebPage(pluginId, pageId, data.action!, data.arguments ?? null, request.signal)
        respond({ ok: true, value: result.value })
      } else {
        const asset = await getPluginWebAsset(pluginId, pageId, data.path!, request.signal)
        const bytes = await asset.arrayBuffer()
        respond({ ok: true, value: { bytes, contentType: asset.type } }, [bytes])
      }
    } catch (cause) { respond({ ok: false, error: getApiErrorMessage(cause, '网页操作失败。') }) }
    finally { inFlight.delete(data.id) }
  }
  port1.start()
  target.contentWindow.postMessage({ type: 'shirobot-web-init' }, '*', [port2])
}
watch(() => [props.pluginId, props.definition.id], () => void load(), { immediate: true })
onBeforeUnmount(close)
</script>
<style scoped>
.web-page { display: flex; flex-direction: column; gap: var(--md-space-4); min-width: 0; }
.page-toolbar { display: flex; align-items: center; justify-content: space-between; }
.page-toolbar h3, .web-page > p { margin: 0; }
iframe { width: 100%; min-height: 560px; border: 0; background: var(--md-sys-color-surface); }
p[role='alert'] { color: var(--md-sys-color-error); }
</style>
