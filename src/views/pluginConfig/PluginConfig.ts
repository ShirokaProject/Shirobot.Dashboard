import { computed, onBeforeUnmount, reactive, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useRoute } from 'vue-router'
import { getApiErrorMessage, getPluginConfig, updatePluginConfig, type PluginConfigMap, type PluginConfigResponse, type PluginConfigSchemaItem, type PluginConfigUpdateResponse, type PluginRoutesConfig } from '../../api'

const sections = [
  { key: 'config', label: '配置', description: '插件运行参数' },
  { key: 'routes', label: '路由', description: '群组生效范围' }
] as const

const emptyRoutes: PluginRoutesConfig = {
  configured: false,
  mode: 'default',
  groups: [],
  effective_mode: 'blacklist',
  effective_groups: [],
  default_mode: 'blacklist',
  default_groups: []
}

function parseGroupList(value: string) {
  return [...new Set(value
    .split(/[,\s]+/)
    .map(item => item.trim())
    .filter(Boolean))]
}

function formatGroupList(value: string[]) {
  return value.join(', ')
}

function createFallbackSchema(config: PluginConfigMap): PluginConfigSchemaItem[] {
  return Object.entries(config).map(([key, value]) => ({
    key,
    label: key,
    type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string',
    description: '',
    placeholder: null,
    options: [],
    min: null,
    max: null
  }))
}

function fieldType(item: PluginConfigSchemaItem) {
  return item.type.trim().toLowerCase()
}

export function usePluginConfigPage(pluginIdSource?: MaybeRefOrGetter<string>) {
  const route = useRoute()
  const activeSection = ref<(typeof sections)[number]['key']>('config')
  const loadError = ref('')
  const saveMessage = ref('')
  const saveMessageType = ref<'success' | 'error'>('success')
  const saving = ref(false)
  const schema = ref<PluginConfigSchemaItem[]>([])
  const config = reactive<PluginConfigMap>({})
  const routes = reactive<PluginRoutesConfig>({ ...emptyRoutes })
  const routeGroupsInput = ref('')
  let dismissTimer: ReturnType<typeof setTimeout> | null = null

  function clearDismissTimer() {
    if (dismissTimer) {
      clearTimeout(dismissTimer)
      dismissTimer = null
    }
  }

  function showSaveMessage(message: string, type: 'success' | 'error') {
    clearDismissTimer()
    saveMessage.value = message
    saveMessageType.value = type
    if (type === 'success') {
      dismissTimer = setTimeout(() => {
        saveMessage.value = ''
      }, 4000)
    }
  }

  const pluginId = computed(() => pluginIdSource ? toValue(pluginIdSource) : String(route.params.pluginId ?? 'plugin'))
  const pluginName = computed(() => pluginId.value)

  function assignResponse(response: PluginConfigResponse) {
    Object.keys(config).forEach(key => delete config[key])
    Object.assign(config, response.config)
    schema.value = response.schema?.length ? response.schema : createFallbackSchema(response.config)
    Object.assign(routes, { ...emptyRoutes, ...response.routes })
    routeGroupsInput.value = formatGroupList(routes.groups)
  }

  function assignUpdateResponse(response: PluginConfigUpdateResponse) {
    if (response.config) {
      Object.keys(config).forEach(key => delete config[key])
      Object.assign(config, response.config)
    }
    if (response.schema) {
      schema.value = response.schema.length ? response.schema : createFallbackSchema(response.config ?? config)
    }
    if (response.routes) {
      Object.assign(routes, { ...emptyRoutes, ...response.routes })
      routeGroupsInput.value = formatGroupList(routes.groups)
    }
  }

  async function loadPluginConfig() {
    loadError.value = ''
    saveMessage.value = ''
    try {
      assignResponse(await getPluginConfig(pluginId.value))
    } catch (error) {
      Object.keys(config).forEach(key => delete config[key])
      schema.value = []
      Object.assign(routes, { ...emptyRoutes })
      routeGroupsInput.value = ''
      loadError.value = `后端插件配置接口暂不可用，请接入 /api/v1/plugins/${pluginId.value}/config 后刷新。`
      void error
    }
  }

  async function savePluginConfig() {
    if (saving.value) return
    saving.value = true
    clearDismissTimer()
    saveMessage.value = ''
    const groups = parseGroupList(routeGroupsInput.value)
    try {
      const response = await updatePluginConfig(pluginId.value, {
        config: { ...config },
        routes: {
          mode: routes.mode,
          groups
        }
      })
      if (response) {
        assignUpdateResponse(response)
      } else {
        await loadPluginConfig()
      }
      showSaveMessage('插件配置已保存', 'success')
    } catch (error) {
      showSaveMessage(getApiErrorMessage(error, '插件配置保存失败'), 'error')
      console.error('Plugin config save failed', error)
    } finally {
      saving.value = false
    }
  }

  watch(pluginId, () => {
    void loadPluginConfig()
  }, { immediate: true })

  onBeforeUnmount(() => {
    clearDismissTimer()
  })

  return {
    pluginName,
    sections,
    activeSection,
    schema,
    config,
    routes,
    routeGroupsInput,
    loadError,
    saveMessage,
    saveMessageType,
    saving,
    fieldType,
    savePluginConfig
  }
}
