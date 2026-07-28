export type PluginStatus = 'enabled' | 'disabled' | 'error'

export type Plugin = {
  id: string
  name: string
  author: string
  repository?: string
  version: string
  latestVersion?: string
  enabled: boolean
  status: PluginStatus
  hasUpdate: boolean
  category: string
  description: string
  errorMessage?: string
  permissions: string[]
  history: Array<{ version: string; date: string }>
}
