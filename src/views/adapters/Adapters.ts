import { offerRestartForStagedUpdate } from '../../features/hostPower/pendingRestart'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { packageFileError, usePackageFileDrop } from '../../features/packages/fileDrop'
import { ElMessageBox } from 'element-plus'
import { ApiError, cancelAdapterUpload, confirmAdapterUpload, createAdapterInstance, deleteAdapter, getAdapterStatus, getAdapters, getApiErrorMessage, reloadAdapterById, startAdapter, stopAdapterById, uploadAdapterPackage } from '../../api'
import type { AdapterInstallPreview, AdapterStatus } from '../../api'

export function useAdaptersPage() {
  const adapters = ref<AdapterStatus[]>([])
  const selectedId = ref('')
  const loading = ref(false)
  const operation = ref('')
  const error = ref('')
  const message = ref('')
  const messageType = ref<'success' | 'error' | 'warning'>('success')
  const instanceVisible = ref(false)
  const instanceId = ref('')
  const instanceName = ref('')
  const instanceError = ref('')
  const instancePackageId = ref('')
  const installVisible = ref(false)
  const installFile = ref<File | null>(null)
  const installPreview = ref<AdapterInstallPreview | null>(null)
  const installReplace = ref(false)
  const installError = ref('')
  const installBusy = ref(false)
  let selectingDroppedFile = false
  const draggingAdapterFile = usePackageFileDrop({
    busy: () => selectingDroppedFile || installBusy.value || Boolean(operation.value),
    drop: files => {
      installVisible.value = true
      const problem = packageFileError(files, '适配器')
      if (problem) { installError.value = problem; return }
      void selectDroppedAdapter(files[0]!)
    }
  })

  async function selectDroppedAdapter(file: File) {
    selectingDroppedFile = true
    try {
      const uploadId = installPreview.value?.uploadId
      if (uploadId) try { await cancelAdapterUpload(uploadId) } catch { /* Best-effort preview cleanup. */ }
      installFile.value = file
      await nextTick()
      await submitInstall()
    } finally { selectingDroppedFile = false }
  }
  const selected = computed(() => adapters.value.find(adapter => adapter.id === selectedId.value) ?? null)

  function notify(text: string, type: 'success' | 'error' | 'warning' = 'success') { message.value = text; messageType.value = type }
  async function loadAdapters() {
    loading.value = true; error.value = ''
    try {
      let list = await getAdapters()
      if (!list.length) {
        const legacy = await getAdapterStatus()
        if (legacy.id || legacy.loaded) list = [legacy]
      }
      adapters.value = list
      selectedId.value = list.some(item => item.id === selectedId.value) ? selectedId.value : (list[0]?.id ?? '')
    } catch (cause) { error.value = getApiErrorMessage(cause, '适配器列表加载失败。') } finally { loading.value = false }
  }
  async function run(id: string, action: 'start' | 'stop' | 'reload' | 'delete') {
    if (!id || operation.value) return
    if (action === 'delete') {
      try { await ElMessageBox.confirm('将停止并删除此实例及其配置。其他实例继续保留；删除最后一个实例时，也会删除适配器包。此操作无法撤销。', '删除适配器', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }) } catch { return }
    }
    operation.value = `${id}:${action}`
    try {
      const response = action === 'start' ? await startAdapter(id) : action === 'stop' ? await stopAdapterById(id) : action === 'reload' ? await reloadAdapterById(id) : await deleteAdapter(id)
      const text = response.message || `适配器 ${action} 完成。`
      if (!response.restartRequired) {
        notify(text, response.ok ? 'success' : 'error')
        if (response.rollback) notify(`${response.message || '操作未完成'} 回滚状态：${response.rollback}`, 'warning')
      }
      await loadAdapters()
      if (response.restartRequired) await offerRestartForStagedUpdate(text, '需要重启宿主')
    } catch (cause) {
      const text = getApiErrorMessage(cause, `适配器 ${action} 失败。`)
      const body = cause instanceof ApiError && cause.body && typeof cause.body === 'object'
        ? cause.body as { restartRequired?: boolean; restart_required?: boolean; pending_restart?: boolean }
        : undefined
      const needsRestart = body?.restartRequired === true || body?.restart_required === true || body?.pending_restart === true
      if (!needsRestart) notify(text, 'error')
      await loadAdapters()
      if (needsRestart) await offerRestartForStagedUpdate(text, '需要重启宿主')
    } finally { operation.value = '' }
  }
  function openInstance() {
    const adapter = selected.value
    if (!adapter || operation.value) return
    instancePackageId.value = adapter.packageId || adapter.id
    instanceId.value = ''; instanceName.value = ''; instanceError.value = ''
    instanceVisible.value = true
  }
  async function createInstance() {
    if (!instanceId.value.trim() || operation.value) return
    operation.value = `${instancePackageId.value}:create`
    instanceError.value = ''
    try {
      const response = await createAdapterInstance(instancePackageId.value, instanceId.value.trim(), instanceName.value.trim())
      selectedId.value = response.adapter?.id || instanceId.value.trim()
      instanceVisible.value = false
      await loadAdapters()
      notify('实例已创建，请打开配置填写连接信息，再启动。')
    } catch (cause) { instanceError.value = getApiErrorMessage(cause, '实例创建失败。') }
    finally { operation.value = '' }
  }
  async function submitInstall() {
    if (!installFile.value || installBusy.value) return
    installBusy.value = true; installError.value = ''
    try { installPreview.value = await uploadAdapterPackage(installFile.value); installReplace.value = installPreview.value.conflict } catch (cause) { installError.value = getApiErrorMessage(cause, '适配器包解析失败。') } finally { installBusy.value = false }
  }
  async function confirmInstall() {
    if (!installPreview.value) return
    installBusy.value = true; installError.value = ''
    try {
      const response = await confirmAdapterUpload(installPreview.value.uploadId, installReplace.value)
      const text = response.message || (response.restartRequired ? '适配器已安装，需要重启宿主后生效。' : '适配器已安装并重载。')
      notify(text, response.restartRequired || response.rollback ? 'warning' : 'success')
      installVisible.value = false; await loadAdapters()
      if (response.restartRequired) void offerRestartForStagedUpdate(text)
    } catch (cause) {
      installError.value = getApiErrorMessage(cause, '适配器确认安装失败。')
      await loadAdapters()
    } finally { installBusy.value = false }
  }
  async function closeInstall(visible: boolean) {
    installVisible.value = visible
    if (visible) return
    const uploadId = installPreview.value?.uploadId
    installFile.value = null; installPreview.value = null; installError.value = ''; installReplace.value = false
    if (uploadId) try { await cancelAdapterUpload(uploadId) } catch { /* Preview cleanup is best effort. */ }
  }
  watch(installFile, () => { installPreview.value = null; installError.value = '' })
  onMounted(() => { void loadAdapters() })
  return { instanceVisible, instanceId, instanceName, instanceError, openInstance, createInstance, adapters, selectedId, selected, loading, operation, error, message, messageType, installVisible, installFile, installPreview, installReplace, installError, installBusy, draggingAdapterFile, loadAdapters, run, submitInstall, confirmInstall, closeInstall }
}
