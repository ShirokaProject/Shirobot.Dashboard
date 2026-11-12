<template>
  <section v-if="loaded && (actions.length || error)" aria-label="适配器操作">
    <p v-if="error" role="alert">{{ error }}</p>
    <div class="button-group">
      <button v-for="action in actions" :key="action.id" class="md-button tonal" type="button"
        :disabled="busy || Boolean(running)" :title="action.description || undefined" @click="execute(action)">
        {{ running === action.id ? '执行中…' : action.label }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiRequest, getApiErrorMessage } from '../../../api'
import type { PluginActionDefinition, PluginActionsResponse, PluginActionResponse } from '../../../api'

const props = defineProps<{ id: string, loaded: boolean, busy: boolean }>()
const actions = ref<PluginActionDefinition[]>([])
const running = ref('')
const error = ref('')
let generation = 0
watch(() => [props.id, props.loaded], async () => {
  const current = ++generation
  actions.value = []
  error.value = ''
  if (!props.loaded) return
  try {
    const result = await apiRequest<PluginActionsResponse>(`/api/v1/adapters/${encodeURIComponent(props.id)}/actions`)
    if (current === generation) actions.value = result.actions
  } catch (cause) {
    if (current === generation) error.value = getApiErrorMessage(cause, '适配器操作失败')
  }
}, { immediate: true })

async function execute(action: PluginActionDefinition) {
  if (running.value) return
  const id = props.id
  if (action.requires_confirmation) {
    try { await ElMessageBox.confirm(action.confirmation_text || action.description || action.label, action.label) }
    catch { return }
  }
  running.value = action.id
  try {
    const result = await apiRequest<PluginActionResponse>(`/api/v1/adapters/${encodeURIComponent(id)}/actions/${encodeURIComponent(action.id)}`, { method: 'POST' })
    ElMessage({ type: result.ok ? 'success' : 'error', message: result.message })
    if (result.details) await ElMessageBox.alert(result.details, result.title || action.label)
  } catch (cause) {
    if (cause !== 'cancel' && cause !== 'close') ElMessage.error(getApiErrorMessage(cause, '适配器操作失败'))
  } finally { running.value = '' }
}
</script>
