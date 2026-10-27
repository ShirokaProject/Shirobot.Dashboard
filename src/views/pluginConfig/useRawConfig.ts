import { computed, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import { ApiError, getApiErrorMessage, getRawConfig, saveRawConfig } from '../../api'
import { toastError } from '../../features/toast'
import type { ConfigTarget } from './usePluginConfig'

/** Load / edit / save a component's config.toml as text. Loads on demand, when raw mode is opened. */
export function useRawConfig(id: Ref<string>, target: MaybeRefOrGetter<ConfigTarget>) {
  const content = ref('')
  const original = ref('')
  const revision = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const dirty = computed(() => content.value !== original.value)

  function apply(next: { content: string; revision: string }) {
    content.value = next.content
    original.value = next.content
    revision.value = next.revision
  }

  async function load() {
    if (!id.value) return
    loading.value = true
    error.value = ''
    try {
      apply(await getRawConfig(toValue(target), id.value))
    } catch (cause) {
      apply({ content: '', revision: '' })
      error.value = getApiErrorMessage(cause, 'config.toml 读取失败')
    } finally {
      loading.value = false
    }
  }

  /** Returns the host's apply status on success, or null when the save was rejected. */
  async function save() {
    saving.value = true
    error.value = ''
    try {
      const response = await saveRawConfig(toValue(target), id.value, content.value, revision.value)
      apply(response)
      return response.apply_status ?? 'saved'
    } catch (cause) {
      // The file changed since loading: keep the draft, but compare against the newer file from now on.
      if (cause instanceof ApiError && cause.status === 409 && cause.body && typeof cause.body === 'object' &&
          'revision' in cause.body && typeof (cause.body as { revision?: unknown }).revision === 'string') {
        const body = cause.body as { content: string; revision: string }
        original.value = body.content
        revision.value = body.revision
      }
      error.value = getApiErrorMessage(cause, 'config.toml 保存失败')
      toastError(error.value)
      return null
    } finally {
      saving.value = false
    }
  }

  return { content, revision, loading, saving, error, dirty, load, save }
}
