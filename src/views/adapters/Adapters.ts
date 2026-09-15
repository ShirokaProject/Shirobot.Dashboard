import { computed, onMounted, ref } from 'vue'
import { getAdapterStatus, getApiErrorMessage, getModels, reloadAdapter, stopAdapter } from '../../api'
import type { AdapterStatus, ModelInfo } from '../../api'

const emptyAdapter: AdapterStatus = {
  loaded: false,
  id: null,
  name: null,
  version: null,
  platform: null,
  assembly_path: null
}

export function useAdaptersPage() {
  const adapter = ref<AdapterStatus>({ ...emptyAdapter })
  const models = ref<ModelInfo[]>([])
  const adapterPath = ref('')
  const loading = ref(false)
  const adapterOperation = ref<'reload' | 'stop' | ''>('')
  const loadError = ref('')
  const actionMessage = ref('')
  const actionMessageType = ref<'success' | 'error'>('success')

  const busy = computed(() => loading.value || Boolean(adapterOperation.value))
  const adapterDisplayName = computed(() => adapter.value.name || adapter.value.id || '未加载 Adapter')

  function showActionMessage(message: string, type: 'success' | 'error' = 'success') {
    actionMessage.value = message
    actionMessageType.value = type
  }

  async function loadComponents() {
    loading.value = true
    loadError.value = ''
    try {
      const [adapterResponse, modelResponse] = await Promise.all([
        getAdapterStatus(),
        getModels()
      ])
      adapter.value = adapterResponse
      models.value = modelResponse
      if (!adapterPath.value && adapterResponse.assembly_path) adapterPath.value = adapterResponse.assembly_path
    } catch (error) {
      loadError.value = getApiErrorMessage(error, '运行组件接口暂不可用。')
    } finally {
      loading.value = false
    }
  }

  async function handleReloadAdapter() {
    if (busy.value) return
    adapterOperation.value = 'reload'
    try {
      const response = await reloadAdapter(adapterPath.value)
      adapter.value = response.adapter
      if (response.adapter.assembly_path) adapterPath.value = response.adapter.assembly_path
      showActionMessage('Adapter 热重载完成。')
    } catch (error) {
      showActionMessage(getApiErrorMessage(error, 'Adapter 热重载失败。'), 'error')
    } finally {
      adapterOperation.value = ''
    }
  }

  async function handleStopAdapter() {
    if (busy.value || !adapter.value.loaded) return
    adapterOperation.value = 'stop'
    try {
      const response = await stopAdapter()
      adapter.value = response.adapter
      showActionMessage('Adapter 已停止并卸载。')
    } catch (error) {
      showActionMessage(getApiErrorMessage(error, 'Adapter 停止失败。'), 'error')
    } finally {
      adapterOperation.value = ''
    }
  }

  onMounted(() => {
    void loadComponents()
  })

  return {
    adapter,
    models,
    adapterPath,
    loading,
    adapterOperation,
    busy,
    loadError,
    actionMessage,
    actionMessageType,
    adapterDisplayName,
    loadComponents,
    handleReloadAdapter,
    handleStopAdapter
  }
}
