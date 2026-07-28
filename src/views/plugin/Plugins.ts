import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { cancelPluginUpload, confirmPluginUpload, deleteInstalledPlugin, getApiErrorMessage, getInstalledPlugins, getPluginActions, runPluginAction, setPluginEnabled, updateInstalledPlugin, uploadPluginPackage } from '../../api'
import type { PluginActionDefinition, PluginUploadParsedResponse } from '../../api'
import type { Plugin, PluginStatus } from '../../features/plugins/types'

export type PluginStatusFilter = {
  key: 'all' | 'issues' | 'unloaded' | 'updates' | 'starred'
  label: string
  count: number
}

export type PluginPrioritySection = {
  key: 'running' | 'closed'
  title: string
  description: string
  icon: string
  plugins: Plugin[]
}

const pluginToggleCooldownMs = 600
const starredPluginsStorageKey = 'shirobot.dashboard.starred-plugins'

function getStoredStarredPluginIds() {
  try {
    const value = JSON.parse(localStorage.getItem(starredPluginsStorageKey) ?? '[]') as unknown
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

export function usePluginsPage() {
  const route = useRoute()
  const router = useRouter()

  const keyword = ref('')
  const uploadDialogVisible = ref(false)
  const selectedPluginFile = ref<File | null>(null)
  const pluginUploadResult = ref<PluginUploadParsedResponse | null>(null)
  const pluginUploadError = ref('')
  const pluginUploadParsing = ref(false)
  const pluginUploadInstalling = ref(false)
  const pluginUploadReplace = ref(true)
  const pluginUploadEnable = ref(true)
  const loadError = ref('')
  const actionSnackbar = ref<{ message: string; type: 'success' | 'error' } | null>(null)
  const pluginActions = ref<PluginActionDefinition[]>([])
  const pluginActionsLoading = ref(false)
  const pluginActionsError = ref('')
  const runningPluginActionId = ref('')
  const hostOperation = ref<'update' | 'delete' | ''>('')

  const installedPlugins = ref<Plugin[]>([])
  const selectedPlugin = ref<Plugin | null>(null)
  const detailVisible = ref(false)
  const configPanelVisible = ref(false)
  const configPanelClosing = ref(false)
  const starredPluginIds = ref(getStoredStarredPluginIds())
  const toggleLockedPluginIds = ref(new Set<string>())
  const togglePendingPluginIds = ref(new Set<string>())
  let pluginActionsRequestId = 0
  let actionSnackbarTimer: ReturnType<typeof setTimeout> | null = null

  function showActionMessage(message: string, type: 'success' | 'error') {
    if (actionSnackbarTimer) window.clearTimeout(actionSnackbarTimer)
    actionSnackbar.value = { message, type }
    actionSnackbarTimer = window.setTimeout(() => {
      actionSnackbar.value = null
      actionSnackbarTimer = null
    }, type === 'success' ? 3000 : 5000)
  }

  function dismissActionSnackbar() {
    if (actionSnackbarTimer) window.clearTimeout(actionSnackbarTimer)
    actionSnackbarTimer = null
    actionSnackbar.value = null
  }

  const totalCount = computed(() => installedPlugins.value.length)
  const configPanelShifted = computed(() => configPanelVisible.value || configPanelClosing.value)
  const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())

  const filteredInstalled = computed(() => {
    return installedPlugins.value.filter(plugin => {
      const matchKeyword = !normalizedKeyword.value || [plugin.name, plugin.author, plugin.category, plugin.description, plugin.version, plugin.latestVersion ?? '']
        .some(value => value.toLowerCase().includes(normalizedKeyword.value))
      return matchKeyword
    })
  })

  const pluginSections = computed<PluginPrioritySection[]>(() => {
    const plugins = filteredInstalled.value
    const sortByPriority = (left: Plugin, right: Plugin) => {
      const updatePriority = Number(right.hasUpdate) - Number(left.hasUpdate)
      if (updatePriority) return updatePriority

      const errorPriority = Number(right.status === 'error') - Number(left.status === 'error')
      if (errorPriority) return errorPriority

      const starPriority = Number(starredPluginIds.value.has(right.id)) - Number(starredPluginIds.value.has(left.id))
      if (starPriority) return starPriority

      return left.name.localeCompare(right.name)
    }

    const sections: PluginPrioritySection[] = [
      {
        key: 'running',
        title: '启动中',
        description: '当前已加载并参与运行的插件。',
        icon: 'plugins-filled',
        plugins: plugins.filter(plugin => plugin.status === 'enabled').sort(sortByPriority)
      },
      {
        key: 'closed',
        title: '已关闭',
        description: '包含手动关闭和加载异常的插件。',
        icon: 'close',
        plugins: plugins.filter(plugin => plugin.status !== 'enabled').sort(sortByPriority)
      }
    ]

    return sections.filter(section => section.plugins.length > 0)
  })

  function isPluginStarred(plugin: Plugin) {
    return starredPluginIds.value.has(plugin.id)
  }

  function togglePluginStar(plugin: Plugin) {
    const nextIds = new Set(starredPluginIds.value)
    if (nextIds.has(plugin.id)) nextIds.delete(plugin.id)
    else nextIds.add(plugin.id)
    starredPluginIds.value = nextIds
    localStorage.setItem(starredPluginsStorageKey, JSON.stringify([...nextIds]))
  }

  function statusText(status: PluginStatus) {
    return {
      enabled: '启用',
      disabled: '关闭',
      error: '错误'
    }[status]
  }

  function selectPlugin(plugin: Plugin) {
    selectedPlugin.value = plugin
    configPanelVisible.value = false
    configPanelClosing.value = false
    detailVisible.value = true
  }

  function isPluginToggleLocked(plugin: Plugin) {
    return Boolean(hostOperation.value)
      || Boolean(runningPluginActionId.value)
      || togglePendingPluginIds.value.has(plugin.id)
      || toggleLockedPluginIds.value.has(plugin.id)
  }

  function isPluginTogglePending(plugin: Plugin) {
    return togglePendingPluginIds.value.has(plugin.id)
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
    const previousEnabled = plugin.enabled
    togglePendingPluginIds.value = new Set(togglePendingPluginIds.value).add(plugin.id)
    plugin.enabled = enabled
    plugin.status = enabled ? 'enabled' : 'disabled'
    lockPluginToggle(plugin.id)

    try {
      const response = await setPluginEnabled(plugin.id, enabled)
      showActionMessage(response.message, response.ok ? 'success' : 'error')
      await loadInstalledPlugins(plugin.id)
      await loadPluginActions(selectedPlugin.value)
    } catch (error) {
      plugin.enabled = previousEnabled
      plugin.status = previousStatus
      showActionMessage(getApiErrorMessage(error, '插件状态更新失败'), 'error')
    } finally {
      const nextPendingIds = new Set(togglePendingPluginIds.value)
      nextPendingIds.delete(plugin.id)
      togglePendingPluginIds.value = nextPendingIds
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
    selectedPlugin.value = plugin
    if (configPanelVisible.value) {
      closePluginConfig()
      return
    }
    configPanelClosing.value = false
    configPanelVisible.value = true
  }

  function closePluginConfig() {
    if (!configPanelVisible.value) return
    configPanelClosing.value = true
    configPanelVisible.value = false
  }

  function finishPluginConfigClose() {
    configPanelClosing.value = false
  }

  function requestPluginDetailClose(done?: () => void) {
    if (configPanelShifted.value) {
      closePluginConfig()
      return
    }

    if (done) done()
    else detailVisible.value = false
  }

  function openPluginConfigPage(plugin: Plugin) {
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
    if (!plugin.enabled || !plugin.repository || hostOperation.value || runningPluginActionId.value) return

    try {
      await ElMessageBox.confirm(
        `将检查“${plugin.name}”的 GitHub Release，并在有可用 DLL 新版本时执行更新。更新期间插件可能短暂不可用。`,
        '更新插件',
        { type: 'info', confirmButtonText: '开始更新', cancelButtonText: '取消' }
      )
    } catch {
      return
    }

    hostOperation.value = 'update'
    try {
      const response = await updateInstalledPlugin(plugin.id)
      showActionMessage(response.message, response.ok ? 'success' : 'error')
      await loadInstalledPlugins(plugin.id)
      await loadPluginActions(selectedPlugin.value)
    } catch (error) {
      showActionMessage(getApiErrorMessage(error, '插件更新失败'), 'error')
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
    try {
      const response = await deleteInstalledPlugin(plugin.id)
      showActionMessage(response.message, response.ok ? 'success' : 'error')
      detailVisible.value = false
      await loadInstalledPlugins()
    } catch (error) {
      showActionMessage(getApiErrorMessage(error, '插件卸载失败'), 'error')
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
    try {
      const response = await runPluginAction(plugin.id, action.id)
      showActionMessage(response.message, response.ok ? 'success' : 'error')
      if (response.refresh) {
        await loadInstalledPlugins(plugin.id)
        await loadPluginActions(selectedPlugin.value)
      }
    } catch (error) {
      showActionMessage(getApiErrorMessage(error, `${action.label}执行失败`), 'error')
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
      showActionMessage(response.success ? '插件安装成功' : '插件安装失败', response.success ? 'success' : 'error')
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

  onBeforeUnmount(() => {
    if (actionSnackbarTimer) window.clearTimeout(actionSnackbarTimer)
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

  watch(detailVisible, visible => {
    if (!visible) {
      configPanelVisible.value = false
      configPanelClosing.value = false
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
    totalCount,
    uploadDialogVisible,
    selectedPluginFile,
    pluginUploadResult,
    pluginUploadError,
    pluginUploadParsing,
    pluginUploadInstalling,
    pluginUploadReplace,
    pluginUploadEnable,
    selectedPlugin,
    detailVisible,
    configPanelVisible,
    configPanelShifted,
    filteredInstalled,
    pluginSections,
    loadError,
    actionSnackbar,
    pluginActions,
    pluginActionsLoading,
    pluginActionsError,
    runningPluginActionId,
    hostOperation,
    statusText,
    dismissActionSnackbar,
    isPluginStarred,
    togglePluginStar,
    isPluginToggleLocked,
    isPluginTogglePending,
    selectPlugin,
    togglePlugin,
    executePluginAction,
    updatePlugin,
    deletePlugin,
    openPluginConfig,
    closePluginConfig,
    finishPluginConfigClose,
    requestPluginDetailClose,
    openPluginConfigPage,
    submitPluginUpload,
    confirmUploadedPlugin
  }
}
