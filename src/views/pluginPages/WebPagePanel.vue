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
import { getPluginWebPage, type PluginPage } from '../../api/plugins/pages'
import { getApiErrorMessage } from '../../api/core/http'
import { webPageDocument } from './webBridge'
import { createWebBridgeHost } from './webBridgeHost'

const props = defineProps<{ pluginId: string; definition: PluginPage }>()
const frame = ref<HTMLIFrameElement>(), document = ref(''), loading = ref(false), error = ref(''), revision = ref(0)
let controller: AbortController | undefined, port: MessagePort | undefined, loads = 0, nonce = ''
function close() { controller?.abort(); port?.close(); port = undefined }
async function load() {
  close(); document.value = ''; loads = 0; nonce = crypto.randomUUID(); revision.value++; error.value = ''; loading.value = true
  const request = controller = new AbortController()
  try {
    const result = await getPluginWebPage(props.pluginId, props.definition.id, request.signal)
    if (!request.signal.aborted) document.value = webPageDocument(result.html, nonce, props.definition.strict_dom === true)
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
  const handle = createWebBridgeHost({
    pluginId: props.pluginId, pageId: props.definition.id, title: props.definition.title,
    confirmations: props.definition.confirmations, nonce, signal: controller.signal,
    post: (message, transfer = []) => port1.postMessage(message, transfer), close: () => port1.close()
  })
  port1.onmessage = ({ data }: MessageEvent<unknown>) => void handle(data)
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
