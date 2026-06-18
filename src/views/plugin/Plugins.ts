import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { cancelPluginUpload, confirmPluginUpload, deletePlugin, getInstalledPlugins, setPluginEnabled, updatePlugin, uploadPluginPackage } from '../../api'
import type { PluginUploadParsedResponse } from '../../api'
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

  const installedPlugins = ref<Plugin[]>([])
  const selectedPlugin = ref<Plugin | null>(null)
  const toggleLockedPluginIds = ref(new Set<string>())

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
    return plugin.status === 'error' || toggleLockedPluginIds.value.has(plugin.id)
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
      await loadInstalledPlugins(plugin.id)
    } catch (error) {
      plugin.status = previousStatus
      console.error('Plugin state update failed', error)
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
      loadError.value = '后端插件接口暂不可用，请接入 /api/v1/plugins/list 后刷新。'
      void error
    }
  }

  function openPluginConfig(plugin: Plugin) {
    router.push(`/plugins/${plugin.id}/config`)
  }

  async function requestPluginUpdate(plugin: Plugin) {
    try {
      const response = await updatePlugin(plugin.id)
      actionMessage.value = response.message
      await loadInstalledPlugins(plugin.id)
    } catch (error) {
      console.error('Plugin update failed', error)
    }
  }

  async function requestPluginDelete(plugin: Plugin) {
    try {
      const response = await deletePlugin(plugin.id)
      actionMessage.value = response.message
      await loadInstalledPlugins()
    } catch (error) {
      console.error('Plugin delete failed', error)
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
      resetPluginUploadState()
      uploadDialogVisible.value = false
      clearUploadQuery()
      await loadInstalledPlugins(response.plugin.id)
    } catch (error) {
      pluginUploadError.value = '插件确认安装失败'
      console.error('Plugin install failed', error)
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
    statusText,
    isPluginToggleLocked,
    selectPlugin,
    togglePlugin,
    requestPluginUpdate,
    requestPluginDelete,
    openPluginConfig,
    submitPluginUpload,
    confirmUploadedPlugin
  }
}
