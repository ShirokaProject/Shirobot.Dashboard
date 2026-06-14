import { computed, h, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getPluginConfig, updatePluginConfig, type PluginConfigForm, type PluginPermissionConfig } from '../../api'

const makeIcon = (path: string) => () => h(
  'svg',
  {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  },
  [h('path', { d: path })]
)

const IconSettings = makeIcon('M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6V20a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1H4a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6V4a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.34.39.68.6 1H20a2 2 0 1 1 0 4h-.09c-.21.32-.4.66-.51 1Z')
const IconShield = makeIcon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z')
const IconZap = makeIcon('M13 2 3 14h8l-1 8 10-12h-8l1-8Z')
const IconCode = makeIcon('m16 18 6-6-6-6M8 6l-6 6 6 6')

const sections = [
  { key: 'basic', label: '基础', description: '基础行为', icon: IconSettings },
  { key: 'permissions', label: '权限', description: '访问控制', icon: IconShield },
  { key: 'triggers', label: '触发器', description: '命令事件', icon: IconZap },
  { key: 'advanced', label: '高级', description: '高级参数', icon: IconCode }
] as const

const emptyForm: PluginConfigForm = {
  alias: '',
  logLevel: 'info',
  debug: false,
  autoLoad: false,
  commandPrefix: '',
  scope: 'all',
  groupMessage: false,
  privateMessage: false,
  timeout: '',
  concurrency: '',
  rawConfig: ''
}

export function usePluginConfigPage() {
  const route = useRoute()
  const activeSection = ref<(typeof sections)[number]['key']>('basic')
  const pluginNameOverride = ref('')
  const loadError = ref('')

  const pluginId = computed(() => String(route.params.pluginId ?? 'plugin'))
  const pluginName = computed(() => {
    if (pluginNameOverride.value) return pluginNameOverride.value
    return pluginId.value
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  })

  const form = reactive<PluginConfigForm>({ ...emptyForm })
  const permissions = ref<PluginPermissionConfig[]>([])

  function assignForm(config: PluginConfigForm) {
    Object.assign(form, config)
  }

  async function loadPluginConfig() {
    loadError.value = ''
    try {
      const response = await getPluginConfig(pluginId.value)
      pluginNameOverride.value = response.pluginName
      assignForm(response.form)
      permissions.value = response.permissions.map(permission => ({ ...permission }))
    } catch (error) {
      pluginNameOverride.value = ''
      assignForm(emptyForm)
      permissions.value = []
      loadError.value = `后端插件配置接口暂不可用，请接入 /api/plugins/${pluginId.value}/config 后刷新。`
      void error
    }
  }

  async function savePluginConfig() {
    try {
      const response = await updatePluginConfig(pluginId.value, {
        pluginName: pluginName.value,
        form: { ...form },
        permissions: permissions.value.map(permission => ({ ...permission }))
      })
      pluginNameOverride.value = response.pluginName
      assignForm(response.form)
      permissions.value = response.permissions.map(permission => ({ ...permission }))
    } catch (error) {
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
    form,
    permissions,
    loadError,
    savePluginConfig
  }
}
