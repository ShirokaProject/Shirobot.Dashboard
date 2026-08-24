import { computed, onMounted, ref } from 'vue'
import { getAdapterStatus, getApiErrorMessage, getModels, installModel, reloadAdapter, reloadModels, stopAdapter } from '../../api'
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
  const selectedModelFile = ref<File | null>(null)
  const loading = ref(false)
  const adapterOperation = ref<'reload' | 'stop' | ''>('')
  const modelOperation = ref<'reload' | 'install' | ''>('')
  const loadError = ref('')
  const actionMessage = ref('')
  const actionMessageType = ref<'success' | 'error'>('success')

  const busy = computed(() => loading.value || Boolean(adapterOperation.value) || Boolean(modelOperation.value))
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

  async function handleReloadModels() {
    if (busy.value) return
    modelOperation.value = 'reload'
    try {
      await reloadModels()
      models.value = await getModels()
      adapter.value = await getAdapterStatus()
      showActionMessage('Models、Adapter 与 Plugins 已按依赖顺序完成热重载。')
    } catch (error) {
      showActionMessage(getApiErrorMessage(error, 'Model 热重载失败。'), 'error')
    } finally {
      modelOperation.value = ''
    }
  }

  function selectModelFile(event: Event) {
    const input = event.target as HTMLInputElement
    selectedModelFile.value = input.files?.[0] ?? null
  }

  async function handleInstallModel() {
    if (busy.value || !selectedModelFile.value) return
    modelOperation.value = 'install'
    try {
      await installModel(selectedModelFile.value)
      models.value = await getModels()
      adapter.value = await getAdapterStatus()
      showActionMessage(`${selectedModelFile.value.name} 已安装并完成依赖组件恢复。`)
      selectedModelFile.value = null
    } catch (error) {
      showActionMessage(getApiErrorMessage(error, 'Model 安装失败。'), 'error')
    } finally {
      modelOperation.value = ''
    }
  }

  onMounted(() => {
    void loadComponents()
  })

  return {
    adapter,
    models,
    adapterPath,
    selectedModelFile,
    loading,
    adapterOperation,
    modelOperation,
    busy,
    loadError,
    actionMessage,
    actionMessageType,
    adapterDisplayName,
    loadComponents,
    handleReloadAdapter,
    handleStopAdapter,
    handleReloadModels,
    selectModelFile,
    handleInstallModel
  }
}
