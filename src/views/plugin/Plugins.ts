import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getInstalledPlugins, setPluginEnabled, uploadPluginPackage } from '../../api'
import type { Plugin, PluginStatus } from '../../features/plugins/types'

export type PluginStatusFilter = {
  key: PluginStatus | 'all'
  label: string
  count: number
}

export function usePluginsPage() {
  const route = useRoute()
  const router = useRouter()

  const keyword = ref('')
  const activeStatus = ref<PluginStatus | 'all'>('all')
  const uploadDialogVisible = ref(false)
  const selectedPluginFile = ref<File | null>(null)
  const loadError = ref('')

  const installedPlugins = ref<Plugin[]>([])
  const selectedPlugin = ref<Plugin | null>(null)

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

  async function togglePlugin(plugin: Plugin, enabled: boolean) {
    if (plugin.status === 'error') return

    const previousStatus = plugin.status
    plugin.status = enabled ? 'enabled' : 'disabled'

    try {
      const updatedPlugin = await setPluginEnabled(plugin.id, enabled)
      Object.assign(plugin, updatedPlugin)
    } catch (error) {
      plugin.status = previousStatus
      console.error('Plugin state update failed', error)
    }
  }

  async function loadInstalledPlugins() {
    loadError.value = ''
    try {
      const plugins = await getInstalledPlugins()
      installedPlugins.value = plugins.map(plugin => ({ ...plugin }))
      selectedPlugin.value = installedPlugins.value[0] ?? null
    } catch (error) {
      installedPlugins.value = []
      selectedPlugin.value = null
      loadError.value = '后端插件接口暂不可用，请接入 /api/plugins 后刷新。'
      void error
    }
  }

  function openPluginConfig(plugin: Plugin) {
    router.push(`/plugins/${plugin.id}/config`)
  }

  function clearUploadQuery() {
    if (route.query.upload !== '1') return
    const nextQuery = { ...route.query }
    delete nextQuery.upload
    delete nextQuery.intent
    router.replace({ path: route.path, query: nextQuery })
  }

  async function submitPluginUpload() {
    if (!selectedPluginFile.value) return

    try {
      await uploadPluginPackage(selectedPluginFile.value)
      selectedPluginFile.value = null
      uploadDialogVisible.value = false
      clearUploadQuery()
      await loadInstalledPlugins()
    } catch (error) {
      console.error('Plugin upload failed', error)
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
    }
  })

  return {
    keyword,
    activeStatus,
    uploadDialogVisible,
    selectedPluginFile,
    selectedPlugin,
    statusFilters,
    filteredInstalled,
    loadError,
    statusText,
    selectPlugin,
    togglePlugin,
    openPluginConfig,
    submitPluginUpload
  }
}
