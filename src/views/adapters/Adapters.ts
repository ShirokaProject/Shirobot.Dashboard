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
      loadError.value = '后端适配器接口暂不可用，请接入 /api/v1/adapters 后刷新。'
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
