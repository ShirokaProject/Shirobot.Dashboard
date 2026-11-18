<template><img v-if="url" :src="url" :alt="alt || '图片'" loading="lazy" /><span v-else>{{ error ? '图片读取失败' : '加载图片…' }}</span></template>
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { getPluginPageImage } from '../../api'
const props = defineProps<{ pluginId: string; ownerKind?: 'plugins' | 'adapters'; pageId: string; file: string; alt?: string }>()
const url = ref(''), error = ref(false)
let controller: AbortController | undefined
function stop() { controller?.abort(); if (url.value) URL.revokeObjectURL(url.value); url.value = '' }
watch(() => [props.pluginId, props.pageId, props.file, props.ownerKind], async () => {
  stop(); error.value = false
  const active = controller = new AbortController()
  try {
    const blob = await getPluginPageImage(props.pluginId, props.pageId, props.file, active.signal, props.ownerKind)
    if (active.signal.aborted) return
    if (!blob.type.startsWith('image/')) throw new Error('非图片文件')
    url.value = URL.createObjectURL(blob)
  } catch { if (!active.signal.aborted) error.value = true }
}, { immediate: true })
onBeforeUnmount(stop)
</script>
