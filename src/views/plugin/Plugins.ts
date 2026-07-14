import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { cancelPluginUpload, confirmPluginUpload, deleteInstalledPlugin, getApiErrorMessage, getInstalledPlugins, getPluginActions, runPluginAction, setPluginEnabled, updateInstalledPlugin, uploadPluginPackage } from '../../api'
import type { PluginActionDefinition, PluginUploadParsedResponse } from '../../api'
import type { Plugin, PluginStatus } from '../../features/plugins/types'

export type PluginStatusFilter = {
  key: PluginStatus | 'all'
  label: string
  count: number
}

const pluginToggleCooldownMs = 5000

export function usePluginsPage() {
  const route = useRoute()
  const router = useRouter()

  const keyword = ref('')
  const activeStatus = ref<PluginStatus | 'all'>('all')
  const uploadDialogVisible = ref(false)
  const selectedPluginFile = ref<File | null>(null)
  const pluginUploadResult = ref<PluginUploadParsedResponse | null>(null)
  const pluginUploadError = ref('')
  const pluginUploadParsing = ref(false)
  const pluginUploadInstalling = ref(false)
  const pluginUploadReplace = ref(true)
  const pluginUploadEnable = ref(true)
  const loadError = ref('')
  const actionMessage = ref('')
  const actionMessageType = ref<'success' | 'error'>('success')
  const pluginActions = ref<PluginActionDefinition[]>([])
  const pluginActionsLoading = ref(false)
  const pluginActionsError = ref('')
  const runningPluginActionId = ref('')
  const hostOperation = ref<'update' | 'delete' | ''>('')

  const installedPlugins = ref<Plugin[]>([])
  const selectedPlugin = ref<Plugin | null>(null)
  const toggleLockedPluginIds = ref(new Set<string>())
  let pluginActionsRequestId = 0

  const enabledCount = computed(() => installedPlugins.value.filter(plugin => plugin.status === 'enabled').length)
  const disabledCount = computed(() => installedPlugins.value.filter(plugin => plugin.status === 'disabled').length)
  const errorCount = computed(() => installedPlugins.value.filter(plugin => plugin.status === 'error').length)
  const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())

  const statusFilters = computed<PluginStatusFilter[]>(() => [
    { key: 'all', label: '全部', count: installedPlugins.value.length },
    { key: 'enabled', label: '启用', count: enabledCount.value },
    { key: 'disabled', label: '关闭', count: disabledCount.value },
    { key: 'error', label: '错误', count: errorCount.value }
  ])

  const filteredInstalled = computed(() => {
    return installedPlugins.value.filter(plugin => {
      const matchStatus = activeStatus.value === 'all' || plugin.status === activeStatus.value
      const matchKeyword = !normalizedKeyword.value || [plugin.name, plugin.author, plugin.category, plugin.description, plugin.version, plugin.latestVersion ?? '']
        .some(value => value.toLowerCase().includes(normalizedKeyword.value))
      return matchStatus && matchKeyword
    })
  })

  function statusText(status: PluginStatus) {
    return {
      enabled: '启用',
      disabled: '关闭',
      error: '错误'
    }[status]
  }

  function selectPlugin(plugin: Plugin) {
    selectedPlugin.value = plugin
  }

  function isPluginToggleLocked(plugin: Plugin) {
    return plugin.status === 'error'
      || Boolean(hostOperation.value)
      || Boolean(runningPluginActionId.value)
      || toggleLockedPluginIds.value.has(plugin.id)
  }

  function lockPluginToggle(pluginId: string) {
    toggleLockedPluginIds.value = new Set(toggleLockedPluginIds.value).add(pluginId)
    window.setTimeout(() => {
      const nextLockedIds = new Set(toggleLockedPluginIds.value)
      nextLockedIds.delete(pluginId)
      toggleLockedPluginIds.value = nextLockedIds
    }, pluginToggleCooldownMs)
  }

  async function togglePlugin(plugin: Plugin, enabled: boolean) {
    if (isPluginToggleLocked(plugin)) return

    const previousStatus = plugin.status
    plugin.status = enabled ? 'enabled' : 'disabled'
    lockPluginToggle(plugin.id)

    try {
      const response = await setPluginEnabled(plugin.id, enabled)
      actionMessage.value = response.message
      actionMessageType.value = response.ok ? 'success' : 'error'
      await loadInstalledPlugins(plugin.id)
      await loadPluginActions(selectedPlugin.value)
    } catch (error) {
      plugin.status = previousStatus
      actionMessageType.value = 'error'
      actionMessage.value = getApiErrorMessage(error, '插件状态更新失败')
    }
  }

  async function loadInstalledPlugins(preferredPluginId = selectedPlugin.value?.id) {
    loadError.value = ''
    try {
      const plugins = await getInstalledPlugins()
      installedPlugins.value = plugins.map(plugin => ({ ...plugin }))
      selectedPlugin.value = installedPlugins.value.find(plugin => plugin.id === preferredPluginId) ?? installedPlugins.value[0] ?? null
    } catch (error) {
      installedPlugins.value = []
      selectedPlugin.value = null
      loadError.value = getApiErrorMessage(error, '插件列表加载失败')
    }
  }

  function openPluginConfig(plugin: Plugin) {
    router.push(`/plugins/${plugin.id}/config`)
  }

  async function loadPluginActions(plugin: Plugin | null | undefined) {
    const requestId = ++pluginActionsRequestId
    pluginActions.value = []
    pluginActionsError.value = ''
    pluginActionsLoading.value = false
    if (!plugin || plugin.status !== 'enabled') return

    pluginActionsLoading.value = true
    try {
      const response = await getPluginActions(plugin.id)
      if (requestId === pluginActionsRequestId) pluginActions.value = response.actions
    } catch (error) {
      if (requestId === pluginActionsRequestId) {
        pluginActionsError.value = getApiErrorMessage(error, '插件操作加载失败')
      }
    } finally {
      if (requestId === pluginActionsRequestId) pluginActionsLoading.value = false
    }
  }

  async function updatePlugin(plugin: Plugin) {
    if (plugin.status !== 'enabled' || hostOperation.value || runningPluginActionId.value) return
    hostOperation.value = 'update'
    actionMessage.value = ''
    try {
      const response = await updateInstalledPlugin(plugin.id)
      actionMessage.value = response.message
      actionMessageType.value = response.ok ? 'success' : 'error'
      await loadInstalledPlugins(plugin.id)
      await loadPluginActions(selectedPlugin.value)
    } catch (error) {
      actionMessageType.value = 'error'
      actionMessage.value = getApiErrorMessage(error, '插件更新失败')
    } finally {
      hostOperation.value = ''
    }
  }

  async function deletePlugin(plugin: Plugin) {
    if (hostOperation.value || runningPluginActionId.value) return
    try {
      await ElMessageBox.confirm(
        `确定要卸载并删除“${plugin.name}”吗？插件文件将从服务器移除。`,
        '卸载插件',
        { type: 'warning', confirmButtonText: '卸载并删除', cancelButtonText: '取消' }
      )
    } catch {
      return
    }

    hostOperation.value = 'delete'
    actionMessage.value = ''
    try {
      const response = await deleteInstalledPlugin(plugin.id)
      actionMessage.value = response.message
      actionMessageType.value = response.ok ? 'success' : 'error'
      await loadInstalledPlugins()
    } catch (error) {
      actionMessageType.value = 'error'
      actionMessage.value = getApiErrorMessage(error, '插件卸载失败')
    } finally {
      hostOperation.value = ''
    }
  }

  function isDangerousAction(action: PluginActionDefinition) {
    return ['danger', 'destructive', 'error'].includes(action.tone.toLowerCase())
  }

  async function executePluginAction(plugin: Plugin, action: PluginActionDefinition) {
    if (hostOperation.value || runningPluginActionId.value) return

    if (isDangerousAction(action) || action.requires_confirmation) {
      try {
        await ElMessageBox.confirm(
          action.confirmation_text || `确定要执行“${action.label}”吗？`,
          action.label,
          {
            type: isDangerousAction(action) ? 'warning' : 'info',
            confirmButtonText: '确认执行',
            cancelButtonText: '取消'
          }
        )
      } catch {
        return
      }
    }

    runningPluginActionId.value = action.id
    actionMessage.value = ''
    try {
      const response = await runPluginAction(plugin.id, action.id)
      actionMessage.value = response.message
      actionMessageType.value = response.ok ? 'success' : 'error'
      if (response.refresh) {
        await loadInstalledPlugins(plugin.id)
        await loadPluginActions(selectedPlugin.value)
      }
    } catch (error) {
      actionMessageType.value = 'error'
      actionMessage.value = getApiErrorMessage(error, `${action.label}执行失败`)
    } finally {
      runningPluginActionId.value = ''
    }
  }

  function clearUploadQuery() {
    if (route.query.upload !== '1') return
    const nextQuery = { ...route.query }
    delete nextQuery.upload
    delete nextQuery.intent
    router.replace({ path: route.path, query: nextQuery })
  }

  async function cleanupPluginUpload() {
    const uploadId = pluginUploadResult.value?.upload_id
    pluginUploadResult.value = null

    if (!uploadId) return

    try {
      await cancelPluginUpload(uploadId)
    } catch (error) {
      console.error('Plugin upload cleanup failed', error)
    }
  }

  function resetPluginUploadState() {
    selectedPluginFile.value = null
    pluginUploadResult.value = null
    pluginUploadError.value = ''
    pluginUploadParsing.value = false
    pluginUploadInstalling.value = false
    pluginUploadReplace.value = true
    pluginUploadEnable.value = true
  }

  async function submitPluginUpload() {
    if (!selectedPluginFile.value) return

    pluginUploadParsing.value = true
    pluginUploadError.value = ''
    pluginUploadResult.value = null

    try {
      const response = await uploadPluginPackage(selectedPluginFile.value)
      if ('error' in response) {
        pluginUploadError.value = response.message
        return
      }

      pluginUploadResult.value = response
      pluginUploadReplace.value = response.conflict?.exists ? response.conflict.action === 'replace' : false
    } catch (error) {
      pluginUploadError.value = '插件上传解析失败'
      console.error('Plugin upload failed', error)
    } finally {
      pluginUploadParsing.value = false
    }
  }

  async function confirmUploadedPlugin() {
    if (!pluginUploadResult.value) return

    pluginUploadInstalling.value = true
    pluginUploadError.value = ''

    try {
      const response = await confirmPluginUpload(pluginUploadResult.value.upload_id, {
        replace: pluginUploadReplace.value,
        enable: pluginUploadEnable.value
      })
      actionMessage.value = response.success ? '插件安装成功' : '插件安装失败'
      actionMessageType.value = response.success ? 'success' : 'error'
      resetPluginUploadState()
      uploadDialogVisible.value = false
      clearUploadQuery()
      await loadInstalledPlugins(response.plugin.id)
    } catch (error) {
      pluginUploadError.value = getApiErrorMessage(error, '插件确认安装失败')
    } finally {
      pluginUploadInstalling.value = false
    }
  }

  onMounted(() => {
    void loadInstalledPlugins()
  })

  watch(
    () => route.query.upload,
    upload => {
      if (upload === '1') {
        uploadDialogVisible.value = true
      }
    },
    { immediate: true }
  )

  watch(uploadDialogVisible, visible => {
    if (!visible) {
      clearUploadQuery()
      if (pluginUploadResult.value) {
        void cleanupPluginUpload()
      } else {
        resetPluginUploadState()
      }
    }
  })

  watch(selectedPluginFile, () => {
    pluginUploadResult.value = null
    pluginUploadError.value = ''
  })

  watch(
    () => selectedPlugin.value ? `${selectedPlugin.value.id}:${selectedPlugin.value.status}` : '',
    () => {
      void loadPluginActions(selectedPlugin.value)
    }
  )

  return {
    keyword,
    activeStatus,
    uploadDialogVisible,
    selectedPluginFile,
    pluginUploadResult,
    pluginUploadError,
    pluginUploadParsing,
    pluginUploadInstalling,
    pluginUploadReplace,
    pluginUploadEnable,
    selectedPlugin,
    statusFilters,
    filteredInstalled,
    loadError,
    actionMessage,
    actionMessageType,
    pluginActions,
    pluginActionsLoading,
    pluginActionsError,
    runningPluginActionId,
    hostOperation,
    statusText,
    isPluginToggleLocked,
    selectPlugin,
    togglePlugin,
    executePluginAction,
    updatePlugin,
    deletePlugin,
    openPluginConfig,
    submitPluginUpload,
    confirmUploadedPlugin
  }
}
