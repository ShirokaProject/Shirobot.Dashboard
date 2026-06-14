import { computed, onMounted, reactive, ref } from 'vue'
import { getAppConfig, updateAppConfig, type AppConfig } from '../../api'

const sections = [
  { key: 'general', label: '通用', description: '协议、日志、控制台与界面主题配置。' },
  { key: 'security', label: '安全', description: '所有者、管理员与 API 访问配置。' }
] as const

interface ConfigForm {
  protocol: string
  enable_log: boolean
  disable_console_input: boolean
  avalonia_theme: string
  owner_list: string
  admin_list: string
  api_enable: boolean
  api_listen_url: string
  api_token: string
}

const emptyConfig: AppConfig = {
  protocol: 'MilkyAdapter',
  enable_log: true,
  disable_console_input: false,
  avalonia_theme: 'Light',
  owner_list: [],
  admin_list: [],
  api: {
    enable: false,
    listen_url: '',
    token: ''
  }
}

const emptyForm: ConfigForm = {
  protocol: emptyConfig.protocol,
  enable_log: emptyConfig.enable_log,
  disable_console_input: emptyConfig.disable_console_input,
  avalonia_theme: emptyConfig.avalonia_theme,
  owner_list: '',
  admin_list: '',
  api_enable: emptyConfig.api.enable,
  api_listen_url: emptyConfig.api.listen_url,
  api_token: emptyConfig.api.token
}

function formatIdList(value: number[]) {
  return value.join(', ')
}

function parseIdList(value: string) {
  return value
    .split(/[,\s]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite)
}

function configToForm(config: AppConfig): ConfigForm {
  return {
    protocol: config.protocol,
    enable_log: config.enable_log,
    disable_console_input: config.disable_console_input,
    avalonia_theme: config.avalonia_theme,
    owner_list: formatIdList(config.owner_list),
    admin_list: formatIdList(config.admin_list),
    api_enable: config.api.enable,
    api_listen_url: config.api.listen_url,
    api_token: config.api.token
  }
}

function formToConfig(form: ConfigForm): AppConfig {
  return {
    protocol: form.protocol,
    enable_log: form.enable_log,
    disable_console_input: form.disable_console_input,
    avalonia_theme: form.avalonia_theme,
    owner_list: parseIdList(form.owner_list),
    admin_list: parseIdList(form.admin_list),
    api: {
      enable: form.api_enable,
      listen_url: form.api_listen_url,
      token: form.api_token
    }
  }
}

export function useConfigPage() {
  const activeSection = ref<(typeof sections)[number]['key']>('general')
  const currentSection = computed(() => sections.find(section => section.key === activeSection.value) ?? sections[0])
  const loadError = ref('')
  const saveMessage = ref('')
  let lastLoadedForm: ConfigForm = { ...emptyForm }

  const form = reactive<ConfigForm>({ ...emptyForm })

  function assignForm(config: ConfigForm) {
    Object.assign(form, config)
  }

  async function loadConfig() {
    loadError.value = ''
    saveMessage.value = ''
    try {
      lastLoadedForm = configToForm(await getAppConfig())
      assignForm(lastLoadedForm)
    } catch (error) {
      lastLoadedForm = { ...emptyForm }
      assignForm(lastLoadedForm)
      loadError.value = '后端配置接口暂不可用，请接入 /api/v1/config 后刷新。'
      void error
    }
  }

  async function saveConfig() {
    saveMessage.value = ''
    try {
      const payload = formToConfig(form)
      const response = await updateAppConfig(payload)
      lastLoadedForm = configToForm(payload)
      assignForm(lastLoadedForm)
      saveMessage.value = response.msg || '配置更新成功'
    } catch (error) {
      console.error('App config save failed', error)
      saveMessage.value = '配置保存失败'
    }
  }

  function resetConfig() {
    assignForm(lastLoadedForm)
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
    saveMessage,
    saveConfig,
    resetConfig
  }
}
