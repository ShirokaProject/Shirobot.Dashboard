import { computed, onMounted, reactive, ref } from 'vue'
import { getAppConfig, updateAppConfig, type AppConfig } from '../../api'

const sections = [
  { key: 'general', label: '通用', description: '基础显示、调试与日志配置。' },
  { key: 'runtime', label: '运行时', description: '端口、目录与热重载相关设置。' },
  { key: 'security', label: '安全', description: '远程管理与管理员权限配置。' }
] as const

const emptyConfig: AppConfig = {
  name: '',
  debug: false,
  logLevel: 'info',
  port: '',
  workdir: '',
  hotReload: false,
  remoteAdmin: false,
  admins: ''
}

export function useConfigPage() {
  const activeSection = ref<(typeof sections)[number]['key']>('general')
  const currentSection = computed(() => sections.find(section => section.key === activeSection.value) ?? sections[0])
  const loadError = ref('')

  const form = reactive<AppConfig>({ ...emptyConfig })

  function assignForm(config: AppConfig) {
    Object.assign(form, config)
  }

  async function loadConfig() {
    loadError.value = ''
    try {
      assignForm(await getAppConfig())
    } catch (error) {
      assignForm(emptyConfig)
      loadError.value = '后端配置接口暂不可用，请接入 /api/config 后刷新。'
      void error
    }
  }

  async function saveConfig() {
    try {
      assignForm(await updateAppConfig({ ...form }))
    } catch (error) {
      console.error('App config save failed', error)
    }
  }

  function resetConfig() {
    assignForm(emptyConfig)
  }

  onMounted(() => {
    void loadConfig()
  })

  return {
    sections,
    activeSection,
    currentSection,
    form,
    loadError,
    saveConfig,
    resetConfig
  }
}
