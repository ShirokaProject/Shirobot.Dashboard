import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { getPluginPages, type PluginPage } from '../../api/plugins/pages'
import { ApiError, getApiErrorMessage } from '../../api/core/http'

const PAGE_VIEW_PREFIX = '__plugin_page__:'
export const pluginPageView = (id: string) => PAGE_VIEW_PREFIX + encodeURIComponent(id)
export const selectedPluginPage = (pages: PluginPage[], view: string) => pages.find(page => pluginPageView(page.id) === view)

/** Page navigation is separate from configuration schema and does not enter config save payloads. */
export function usePluginPages(pluginId: MaybeRefOrGetter<string>, enabled: MaybeRefOrGetter<boolean>, target: MaybeRefOrGetter<string> = 'plugin') {
  const pages = ref<PluginPage[]>([])
  const loading = ref(false)
  const error = ref('')
  let request: AbortController | undefined
  async function load() {
    request?.abort(); pages.value = []; error.value = ''; loading.value = false
    const id = toValue(pluginId)
    if (!id || !toValue(enabled)) return
    const controller = request = new AbortController()
    loading.value = true
    try {
      const response = await getPluginPages(id, controller.signal, toValue(target) === 'adapter' ? 'adapters' : 'plugins')
      if (!controller.signal.aborted) pages.value = response.pages ?? []
    } catch (cause) {
      // Older hosts and unloaded plugins have no page endpoint; configuration still works.
      if (!controller.signal.aborted && !(cause instanceof ApiError && cause.status === 404))
        error.value = getApiErrorMessage(cause, '插件页面加载失败。')
    } finally { if (!controller.signal.aborted) loading.value = false }
  }
  watch(() => [toValue(pluginId), toValue(enabled), toValue(target)], () => void load(), { immediate: true })
  onScopeDispose(() => request?.abort())
  return { pages, loading, error, load }
}
