import { computed, onMounted, reactive, ref } from 'vue'
import { getApiErrorMessage, getAppConfig, updateAppConfig, type AppConfig } from '../../api'
import { normalizeIdTags } from '../../features/idTags'

// The host config has a fixed shape, so its categories are defined here (unlike plugin schemas).
export const sections = [
  { key: 'general', label: '基本', icon: 'settings', description: '日志、控制台与桌面端主题。', count: 4 },
  { key: 'update', label: '更新', icon: 'download', description: '主程序更新来源与 GitHub 下载代理。', count: 2 },
  { key: 'access', label: '权限', icon: 'shield', description: '拥有最高权限的所有者与管理员账号。', count: 2 },
  { key: 'api', label: 'API', icon: 'code', description: 'Dashboard 与外部工具访问主程序的接口。', count: 6 }
] as const

export type SectionKey = (typeof sections)[number]['key']

// Auto switches by the clock on the host (dark from 18:00 to 06:00); it does not follow the OS.
export const themeOptions = [
  { value: 'Light', label: '浅色' },
  { value: 'Dark', label: '深色' },
  { value: 'Auto', label: '自动（按时间）' }
]

/** Older dashboards saved "System" for the clock-based mode. */
function normalizeTheme(theme: string) {
  const value = theme.trim().toLowerCase()
  if (value === 'dark') return 'Dark'
  if (value === 'auto' || value === 'system') return 'Auto'
  return 'Light'
}

/**
 * Editable copy of AppConfig: lists stay lists (tag inputs), null base URL becomes ''.
 * `protocols` is left out on purpose: adapters are managed on the adapter page, so the dashboard
 * neither shows nor sends it and the value in config.toml (standalone DLL paths) is kept as written.
 */
export interface ConfigForm {
  enable_log: boolean
  showid: boolean
  disable_console_input: boolean
  github_proxy: string
  host_update_repository: string
  avalonia_theme: string
  owner_list: string[]
  admin_list: string[]
  api_enable: boolean
  api_listen_url: string
  api_listen_urls: string[]
  api_public_base_url: string
  api_auth_enable: boolean
  api_token: string
}

const emptyForm: ConfigForm = {
  enable_log: true,
  showid: false,
  disable_console_input: false,
  github_proxy: '',
  host_update_repository: '',
  avalonia_theme: 'Auto',
  owner_list: [],
  admin_list: [],
  api_enable: false,
  api_listen_url: '',
  api_listen_urls: [],
  api_public_base_url: '',
  api_auth_enable: true,
  api_token: ''
}

function configToForm(config: AppConfig): ConfigForm {
  return {
    enable_log: config.enable_log,
    showid: config.showid ?? false,
    disable_console_input: config.disable_console_input,
    github_proxy: config.github_proxy,
    host_update_repository: config.host_update_repository,
    avalonia_theme: normalizeTheme(config.avalonia_theme),
    owner_list: config.owner_list.map(String),
    admin_list: config.admin_list.map(String),
    api_enable: config.api.enable,
    api_listen_url: config.api.listen_url,
    api_listen_urls: [...config.api.listen_urls],
    api_public_base_url: config.api.public_base_url ?? '',
    api_auth_enable: config.api.auth_enable,
    api_token: config.api.token
  }
}

function formToConfig(form: ConfigForm): AppConfig {
  return {
    enable_log: form.enable_log,
    showid: form.showid,
    disable_console_input: form.disable_console_input,
    github_proxy: form.github_proxy.trim(),
    host_update_repository: form.host_update_repository.trim(),
    avalonia_theme: form.avalonia_theme,
    // Sent as strings: IDs are not always numeric, and large numbers would lose precision as numbers
    owner_list: normalizeIdTags(form.owner_list),
    admin_list: normalizeIdTags(form.admin_list),
    api: {
      enable: form.api_enable,
      listen_url: form.api_listen_url.trim(),
      listen_urls: form.api_listen_urls.map(url => url.trim()).filter(Boolean),
      public_base_url: form.api_public_base_url.trim() || null,
      auth_enable: form.api_auth_enable,
      token: form.api_token
    }
  }
}

function cloneForm(form: ConfigForm): ConfigForm {
  return JSON.parse(JSON.stringify(form)) as ConfigForm
}

export function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function useConfigPage() {
  const activeSection = ref<SectionKey>('general')
  const currentSection = computed(() => sections.find(section => section.key === activeSection.value) ?? sections[0])
  const loading = ref(true)
  const saving = ref(false)
  const loadError = ref('')
  const saveError = ref('')

  const form = reactive<ConfigForm>(cloneForm(emptyForm))
  const loaded = ref<ConfigForm>(cloneForm(emptyForm))
  const dirty = computed(() => JSON.stringify(form) !== JSON.stringify(loaded.value))

  async function loadConfig() {
    loading.value = true
    loadError.value = ''
    try {
      loaded.value = configToForm(await getAppConfig())
    } catch (error) {
      loaded.value = cloneForm(emptyForm)
      loadError.value = getApiErrorMessage(error, '读取配置失败')
    } finally {
      Object.assign(form, cloneForm(loaded.value))
      loading.value = false
    }
  }

  async function saveConfig() {
    saving.value = true
    saveError.value = ''
    try {
      const payload = formToConfig(form)
      await updateAppConfig(payload)
      loaded.value = configToForm(payload)
      Object.assign(form, cloneForm(loaded.value))
      return true
    } catch (error) {
      saveError.value = getApiErrorMessage(error, '配置保存失败')
      return false
    } finally {
      saving.value = false
    }
  }

  function discard() {
    Object.assign(form, cloneForm(loaded.value))
    saveError.value = ''
  }

  onMounted(() => {
    void loadConfig()
  })

  return {
    activeSection,
    currentSection,
    form,
    loading,
    saving,
    loadError,
    saveError,
    dirty,
    loadConfig,
    saveConfig,
    discard
  }
}
