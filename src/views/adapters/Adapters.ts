import { onMounted, ref } from 'vue'
import { getAdapters, type AdapterInfo } from '../../api'

export function useAdaptersPage() {
  const adapters = ref<AdapterInfo[]>([])
  const loadError = ref('')

  async function loadAdapters() {
    loadError.value = ''
    try {
      adapters.value = await getAdapters()
    } catch (error) {
      adapters.value = []
      loadError.value = '后端概览接口暂不可用，无法读取当前适配器状态。'
      void error
    }
  }

  onMounted(() => {
    void loadAdapters()
  })

  return {
    adapters,
    loadError
  }
}
