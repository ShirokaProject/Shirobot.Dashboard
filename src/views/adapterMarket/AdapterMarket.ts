import { computed, onMounted, ref } from 'vue'
import { cancelAdapterUpload, confirmAdapterUpload, getAdapterMarketAdapters, getApiErrorMessage, prepareGithubAdapterInstall } from '../../api'
import type { AdapterInstallPreview, AdapterMarketEntry } from '../../api'

export function useAdapterMarketPage() {
  const entries = ref<AdapterMarketEntry[]>([])
  const keyword = ref('')
  const platform = ref('全部')
  const loading = ref(false)
  const error = ref('')
  const message = ref('')
  const messageType = ref<'success' | 'error' | 'warning'>('success')
  const busyId = ref('')
  const preview = ref<AdapterInstallPreview | null>(null)
  const replace = ref(false)
  const installVisible = ref(false)
  const installBusy = ref(false)
  const installError = ref('')
  const platforms = computed(() => ['全部', ...new Set(entries.value.map(entry => entry.platform).filter(Boolean))])
  const filtered = computed(() => {
    const query = keyword.value.trim().toLowerCase()
    return entries.value.filter(entry => (platform.value === '全部' || entry.platform === platform.value) && (!query || [entry.id, entry.name, entry.description, entry.repository, entry.platform, ...entry.authors].some(value => value.toLowerCase().includes(query))))
  })
  async function load() { loading.value = true; error.value = ''; try { entries.value = await getAdapterMarketAdapters() } catch (cause) { error.value = getApiErrorMessage(cause, 'Adapter 市场加载失败。') } finally { loading.value = false } }
  async function prepare(entry: AdapterMarketEntry) {
    if (!entry.repository || busyId.value) return
    busyId.value = entry.id; installError.value = ''
    try { preview.value = await prepareGithubAdapterInstall(entry.repository, entry.asset); replace.value = preview.value.conflict; installVisible.value = true } catch (cause) { message.value = getApiErrorMessage(cause, '从 GitHub 准备安装失败。'); messageType.value = 'error' } finally { busyId.value = '' }
  }
  async function confirm() { if (!preview.value) return; installBusy.value = true; installError.value = ''; try { const response = await confirmAdapterUpload(preview.value.uploadId, replace.value); installVisible.value = false; message.value = response.restartRequired ? 'Adapter 已安装，需要重启宿主后完全生效。' : (response.message || 'Adapter 已安装并重载。'); messageType.value = response.rollback ? 'warning' : 'success'; await load() } catch (cause) { installError.value = getApiErrorMessage(cause, '确认安装失败。') } finally { installBusy.value = false } }
  async function close(visible: boolean) { installVisible.value = visible; if (visible) return; const id = preview.value?.uploadId; preview.value = null; installError.value = ''; replace.value = false; if (id) try { await cancelAdapterUpload(id) } catch { /* Cleanup is best effort. */ } }
  onMounted(() => { void load() })
  return { entries, keyword, platform, platforms, filtered, loading, error, message, messageType, busyId, preview, replace, installVisible, installBusy, installError, load, prepare, confirm, close }
}
