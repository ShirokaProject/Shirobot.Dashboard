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
  github_proxy: string
  host_update_repository: string
  avalonia_theme: string
  owner_list: string
  admin_list: string
  api_enable: boolean
  api_listen_url: string
  api_listen_urls: string
  api_public_base_url: string
  api_auth_enable: boolean
  api_token: string
}

const emptyConfig: AppConfig = {
  protocol: 'MilkyAdapter',
  enable_log: true,
  disable_console_input: false,
  github_proxy: '',
  host_update_repository: '',
  avalonia_theme: 'Light',
  owner_list: [],
  admin_list: [],
  api: {
    enable: false,
    listen_url: '',
    listen_urls: [],
    public_base_url: null,
    auth_enable: true,
    token: ''
  }
}

const emptyForm: ConfigForm = {
  protocol: emptyConfig.protocol,
  enable_log: emptyConfig.enable_log,
  disable_console_input: emptyConfig.disable_console_input,
  github_proxy: emptyConfig.github_proxy,
  host_update_repository: emptyConfig.host_update_repository,
  avalonia_theme: emptyConfig.avalonia_theme,
  owner_list: '',
  admin_list: '',
  api_enable: emptyConfig.api.enable,
  api_listen_url: emptyConfig.api.listen_url,
  api_listen_urls: '',
  api_public_base_url: '',
  api_auth_enable: emptyConfig.api.auth_enable,
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

function formatStringList(value: string[]) {
  return value.join('\n')
}

function parseStringList(value: string) {
  return value
    .split(/[\n,]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function configToForm(config: AppConfig): ConfigForm {
  return {
    protocol: config.protocol,
    enable_log: config.enable_log,
    disable_console_input: config.disable_console_input,
    github_proxy: config.github_proxy,
    host_update_repository: config.host_update_repository,
    avalonia_theme: config.avalonia_theme,
    owner_list: formatIdList(config.owner_list),
    admin_list: formatIdList(config.admin_list),
    api_enable: config.api.enable,
    api_listen_url: config.api.listen_url,
    api_listen_urls: formatStringList(config.api.listen_urls),
    api_public_base_url: config.api.public_base_url ?? '',
    api_auth_enable: config.api.auth_enable,
    api_token: config.api.token
  }
}

function formToConfig(form: ConfigForm): AppConfig {
  return {
    protocol: form.protocol,
    enable_log: form.enable_log,
    disable_console_input: form.disable_console_input,
    github_proxy: form.github_proxy,
    host_update_repository: form.host_update_repository,
    avalonia_theme: form.avalonia_theme,
    owner_list: parseIdList(form.owner_list),
    admin_list: parseIdList(form.admin_list),
    api: {
      enable: form.api_enable,
      listen_url: form.api_listen_url,
      listen_urls: parseStringList(form.api_listen_urls),
      public_base_url: form.api_public_base_url.trim() || null,
      auth_enable: form.api_auth_enable,
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
