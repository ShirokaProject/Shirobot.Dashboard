export type PluginStatus = 'enabled' | 'disabled' | 'error'

export type Plugin = {
  id: string
  name: string
  author: string
  repo?: string
  version: string
  latestVersion?: string
  status: PluginStatus
  hasUpdate: boolean
  category: string
  description: string
  errorMessage?: string
  /** Dispatch priority of a loaded plugin, smaller first; absent when not loaded or on older hosts */
  priority?: number
  permissions: string[]
  history: Array<{ version: string; date: string }>
}
