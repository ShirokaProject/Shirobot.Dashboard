import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getPluginConfig, updatePluginConfig, type PluginConfigMap, type PluginConfigResponse, type PluginConfigSchemaItem, type PluginRoutesConfig } from '../../api'

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
  return value
    .split(/[,\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite)
}

function formatGroupList(value: number[]) {
  return value.join(', ')
}

function createFallbackSchema(config: PluginConfigMap): PluginConfigSchemaItem[] {
  return Object.entries(config).map(([key, value]) => ({
    key,
    label: key,
    type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string',
    description: null,
    placeholder: null,
    options: [],
    min: null,
    max: null
  }))
}

export function usePluginConfigPage() {
  const route = useRoute()
  const activeSection = ref<(typeof sections)[number]['key']>('config')
  const loadError = ref('')
  const saveMessage = ref('')
  const schema = ref<PluginConfigSchemaItem[]>([])
  const config = reactive<PluginConfigMap>({})
  const routes = reactive<PluginRoutesConfig>({ ...emptyRoutes })
  const routeGroupsInput = ref('')

  const pluginId = computed(() => String(route.params.pluginId ?? 'plugin'))
  const pluginName = computed(() => pluginId.value)

  function assignResponse(response: PluginConfigResponse) {
    Object.keys(config).forEach(key => delete config[key])
    Object.assign(config, response.config)
    schema.value = response.schema.length ? response.schema : createFallbackSchema(response.config)
    Object.assign(routes, { ...emptyRoutes, ...response.routes })
    routeGroupsInput.value = formatGroupList(routes.groups)
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
    saveMessage.value = ''
    try {
      const response = await updatePluginConfig(pluginId.value, {
        config: { ...config },
        routes: {
          mode: routes.mode,
          groups: parseGroupList(routeGroupsInput.value)
        }
      })
      assignResponse(response)
      saveMessage.value = '插件配置已保存'
    } catch (error) {
      saveMessage.value = '插件配置保存失败'
      console.error('Plugin config save failed', error)
    }
  }

  onMounted(() => {
    void loadPluginConfig()
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
    savePluginConfig
  }
}
