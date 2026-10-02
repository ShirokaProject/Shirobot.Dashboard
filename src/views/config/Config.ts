import { computed, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { getApiErrorMessage, getAppConfig, updateAppConfig, type AppConfigData } from '../../api'
import type { ConfigField, ConfigGroup } from '../pluginConfig/usePluginConfig'
import type { PluginConfigSchemaItem } from '../../api/plugins/config'

export interface HostConfigField extends ConfigField {
  path: string
  group: string
  groupLabel: string
  groupOrder: number
  groupIcon: string
  groupDescription: string
}

interface HostConfigGroup extends Omit<ConfigGroup, 'fields'> {
  icon: string
  description: string
  fields: HostConfigField[]
}

const EMPTY_CONFIG: AppConfigData = {}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function pathValue(source: AppConfigData, path: string): unknown {
  let value: unknown = source
  for (const part of path.split('.')) {
    if (value === null || typeof value !== 'object') return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return value
}

function setPathValue(target: AppConfigData, path: string, value: unknown) {
  const parts = path.split('.')
  let node = target
  for (const part of parts.slice(0, -1)) {
    const next = node[part]
    if (!next || typeof next !== 'object' || Array.isArray(next)) node[part] = {}
    node = node[part] as AppConfigData
  }
  node[parts.at(-1)!] = value
}

function collectFields(
  schema: PluginConfigSchemaItem[],
  prefix = '',
  inheritedGroup?: { id: string; label: string; order: number; icon: string; description: string }
): HostConfigField[] {
  const fields: HostConfigField[] = []
  for (const item of schema) {
    const path = prefix ? `${prefix}.${item.key}` : item.key
    const ownId = item.group_id?.trim() || item.group?.trim()
    const ownLabel = item.group_label?.trim() || item.group?.trim()
    const group = {
      id: ownId || inheritedGroup?.id || item.key,
      label: ownLabel || inheritedGroup?.label || item.label || item.key,
      order: item.group_order ?? inheritedGroup?.order ?? Number.MAX_SAFE_INTEGER,
      icon: item.group_icon?.trim() || inheritedGroup?.icon || '',
      description: item.group_description?.trim() || inheritedGroup?.description || ''
    }

    if (item.type === 'section' && item.fields?.length) {
      fields.push(...collectFields(item.fields, path, group))
      continue
    }
    if (item.type === 'object') continue

    fields.push({
      item,
      path,
      group: group.id,
      groupLabel: group.label,
      groupOrder: group.order,
      groupIcon: group.icon,
      groupDescription: group.description,
      label: item.label || item.key,
      description: item.description ?? '',
      enabled: true,
      enumOptions: null
    })
  }
  return fields
}

function fieldsWithDefaults(config: AppConfigData, schema: PluginConfigSchemaItem[], prefix = '') {
  for (const item of schema) {
    const path = prefix ? `${prefix}.${item.key}` : item.key
    if (item.type === 'section' && item.fields) {
      if (pathValue(config, path) === undefined) setPathValue(config, path, {})
      fieldsWithDefaults(config, item.fields, path)
    } else if (pathValue(config, path) === undefined && item.default_value !== undefined && item.default_value !== null) {
      setPathValue(config, path, clone(item.default_value))
    }
  }
}

function findNullPaths(value: unknown, prefix = ''): string[] {
  if (value === null) return [prefix || '(根配置)']
  if (Array.isArray(value)) return value.flatMap((item, index) => findNullPaths(item, `${prefix}[${index}]`))
  if (typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, item]) => findNullPaths(item, prefix ? `${prefix}.${key}` : key))
}

function passesConditions(item: PluginConfigSchemaItem, config: AppConfigData, effect: 'visible' | 'enabled') {
  return (item.conditions ?? []).filter(condition => condition.effect === effect).every(condition => {
    const current = pathValue(config, condition.field)
    const expected = condition.value ?? ''
    if (current === undefined) return true
    if (['gt', 'gte', 'lt', 'lte'].includes(condition.operator)) {
      const left = Number(current)
      const right = Number(expected)
      if (!Number.isFinite(left) || !Number.isFinite(right)) return false
      if (condition.operator === 'gt') return left > right
      if (condition.operator === 'gte') return left >= right
      if (condition.operator === 'lt') return left < right
      return left <= right
    }
    const equal = String(current ?? '') === expected
    return condition.operator === 'ne' ? !equal : equal
  })
}

function makePatch(config: AppConfigData, fields: HostConfigField[]): AppConfigData {
  const patch: AppConfigData = {}
  for (const field of fields) {
    let value = pathValue(config, field.path)
    if (value === null) {
      if (['string', 'text', 'password'].includes(field.item.type)) value = ''
      else throw new Error(`配置项“${field.label}”当前为空值，请填写后再保存。`)
    }
    if (value !== undefined) {
      const nestedNulls = findNullPaths(value)
      if (nestedNulls.length) throw new Error(`配置项“${field.label}”包含空值（null），请修正后再保存。`)
    }
    setPathValue(patch, field.path, value)
  }
  return patch
}

export function useConfigPage() {
  const activeGroup = ref('')
  const loading = ref(true)
  const saving = ref(false)
  const loadError = ref('')
  const loadWarning = ref('')
  const saveError = ref('')
  const schema = shallowRef<PluginConfigSchemaItem[]>([])
  const config = reactive<AppConfigData>({})
  const loadedSnapshot = ref('')

  const allFields = computed<HostConfigField[]>(() => collectFields(schema.value))
  const visibleFields = computed(() => allFields.value.filter(field => passesConditions(field.item, config, 'visible')))
  const groups = computed<HostConfigGroup[]>(() => {
    const map = new Map<string, HostConfigGroup>()
    for (const field of visibleFields.value) {
      const group = map.get(field.group) ?? {
        key: field.group,
        label: field.groupLabel,
        order: field.groupOrder,
        icon: field.groupIcon,
        description: field.groupDescription,
        fields: [] as HostConfigField[]
      }
      group.fields.push({ ...field, enabled: passesConditions(field.item, config, 'enabled') })
      map.set(field.group, group)
    }
    return [...map.values()]
      .map(group => ({
        ...group,
        fields: group.fields.sort((left, right) => (left.item.order ?? 0) - (right.item.order ?? 0))
      }))
      .sort((left, right) => left.order - right.order)
  })
  const currentGroup = computed(() => groups.value.find(group => group.key === activeGroup.value) ?? groups.value[0])
  const dirty = computed(() => Boolean(loadedSnapshot.value) && JSON.stringify(config) !== loadedSnapshot.value)

  function replaceConfig(next: AppConfigData) {
    Object.keys(config).forEach(key => delete config[key])
    Object.assign(config, clone(next))
  }

  function setFieldValue(path: string, value: unknown) {
    setPathValue(config, path, value)
  }

  async function loadConfig() {
    loading.value = true
    loadError.value = ''
    loadWarning.value = ''
    saveError.value = ''
    loadedSnapshot.value = ''
    try {
      const response = await getAppConfig()
      schema.value = Array.isArray(response.schema) ? response.schema : []
      const next = clone(response.config ?? EMPTY_CONFIG)
      fieldsWithDefaults(next, schema.value)
      const nullPaths = findNullPaths(next)
      replaceConfig(next)
      if (nullPaths.length) loadWarning.value = `服务器配置含 null：${nullPaths.join('、')}。保存前请填写这些值。`
      loadedSnapshot.value = JSON.stringify(config)
      if (!groups.value.some(group => group.key === activeGroup.value)) activeGroup.value = groups.value[0]?.key ?? ''
    } catch (error) {
      replaceConfig({})
      schema.value = []
      loadError.value = getApiErrorMessage(error, '读取配置失败')
    } finally {
      loading.value = false
    }
  }

  async function saveConfig() {
    saving.value = true
    saveError.value = ''
    try {
      await updateAppConfig(makePatch(config, allFields.value))
      await loadConfig()
      if (!loadError.value) return true
      saveError.value = loadError.value
      return false
    } catch (error) {
      saveError.value = getApiErrorMessage(error, '配置保存失败')
      return false
    } finally {
      saving.value = false
    }
  }

  function discard() {
    if (!loadedSnapshot.value) return
    replaceConfig(JSON.parse(loadedSnapshot.value) as AppConfigData)
    saveError.value = ''
  }

  watch(groups, next => {
    if (!next.some(group => group.key === activeGroup.value)) activeGroup.value = next[0]?.key ?? ''
  })
  onMounted(() => { void loadConfig() })

  return {
    activeGroup,
    currentGroup,
    groups,
    config,
    loading,
    saving,
    loadError,
    loadWarning,
    saveError,
    dirty,
    loadConfig,
    saveConfig,
    discard,
    setFieldValue,
    fieldValue: (path: string) => pathValue(config, path)
  }
}
