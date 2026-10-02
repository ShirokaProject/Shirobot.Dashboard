import { computed, reactive, ref, shallowRef, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import {
  ApiError,
  getAdapterConfig,
  getApiErrorMessage,
  getPluginConfig,
  updateAdapterConfig,
  updatePluginConfig,
  type PluginConfigMap,
  type PluginConfigResponse,
  type PluginConfigSchemaItem,
  type PluginConfigUpdateResponse,
  type PluginConfigValue,
  type PluginRoutesConfig
} from '../../api'
import { normalizeIdTags } from '../../features/idTags'

export interface EnumOption {
  value: number
  label: string
}

/** A schema item prepared for display: group split out of the label, enum parsed out of the description. */
export interface ConfigField {
  item: PluginConfigSchemaItem
  path?: string
  label: string
  description: string
  enabled: boolean
  /** Number fields whose description enumerates `0=A，1=B…` become a button group. */
  enumOptions: EnumOption[] | null
}

export interface ConfigGroup {
  key: string
  label: string
  order: number
  fields: ConfigField[]
  /** Set when the group is a top-level `section`: its fields live in `config[parentKey]`. */
  parentKey?: string
  description?: string
}

const SCALAR_TYPES = new Set(['string', 'text', 'password', 'number', 'integer', 'boolean', 'select'])

export function isConfigObject(value: unknown): value is Record<string, PluginConfigValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const DEFAULT_GROUP = '常规'

/** Navigator key for the routes view, alongside the config group keys. */
export const ROUTES_VIEW = '__routes__'
/** Navigator key for an adapter instance's name / ID. */
export const INSTANCE_VIEW = '__instance__'

const emptyRoutes: PluginRoutesConfig = {
  configured: false,
  mode: 'default',
  groups: [],
  effective_mode: 'blacklist',
  effective_groups: [],
  default_mode: 'blacklist',
  default_groups: []
}

function inferValueType(value: PluginConfigValue | undefined): string {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number'
  if (Array.isArray(value)) return 'array'
  if (isConfigObject(value)) return 'object'
  return 'string'
}

/** Without a schema (older components) the editor still has to match each value's shape. */
function createFallbackSchema(config: PluginConfigMap): PluginConfigSchemaItem[] {
  return Object.entries(config).map(([key, value]) => {
    const type = inferValueType(value)
    const itemTypes = Array.isArray(value) ? [...new Set(value.map(inferValueType))] : []
    return {
      key,
      label: key,
      type,
      item_type: type === 'array' ? (itemTypes.length === 1 ? itemTypes[0] : itemTypes.length ? 'object' : 'string') : null,
      description: null,
      placeholder: null,
      options: [],
      min: null,
      max: null
    }
  })
}

function cloneConfigValue<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T
}

/** A new value for a field: its declared default, else an empty value of its type. */
export function createDefaultValue(item: PluginConfigSchemaItem): PluginConfigValue {
  if (item.default_value !== undefined && item.default_value !== null) return cloneConfigValue(item.default_value as PluginConfigValue)
  if (item.type === 'section' && item.fields?.length)
    return Object.fromEntries(item.fields.map(field => [field.key, createDefaultValue(field)]))
  switch (item.type) {
    case 'boolean': return false
    case 'number':
    case 'integer': return 0
    case 'array': return []
    case 'section':
    case 'object': return {}
    default: return ''
  }
}

function withSchemaDefaults(config: PluginConfigMap, schema: PluginConfigSchemaItem[]): PluginConfigMap {
  const merged: PluginConfigMap = {}
  for (const item of schema) {
    const value = item.default_value
    if (!Object.prototype.hasOwnProperty.call(item, 'default_value') || value === undefined) continue
    // Free-form tables have no meaningful default to show; sections get theirs so nested fields can bind.
    if (isConfigObject(value) && item.type !== 'section') continue
    merged[item.key] = cloneConfigValue(value as PluginConfigValue)
  }
  return Object.assign(merged, config)
}

/**
 * Grouping is the plugin's call, not the dashboard's: use `schema.group` when the backend
 * provides it, else a `【组名】` label prefix the plugin already wrote, else the default group.
 * The frontend deliberately doesn't invent categories of its own.
 */
function splitGroup(item: PluginConfigSchemaItem) {
  const raw = item.label || item.key
  const match = raw.match(/^\s*[【[]([^】\]]+)[】\]]\s*(.+)$/)
  const label = match ? match[2].trim() : raw
  const group = item.group_id?.trim() || item.group?.trim() || match?.[1].trim() || DEFAULT_GROUP
  const groupLabel = item.group_label?.trim() || item.group?.trim() || match?.[1].trim() || DEFAULT_GROUP
  return { group, groupLabel, label }
}

function conditionMatches(condition: NonNullable<PluginConfigSchemaItem['conditions']>[number], values: PluginConfigMap) {
  const current = values[condition.field]
  const expected = condition.value

  if (condition.operator === 'gt' || condition.operator === 'gte' || condition.operator === 'lt' || condition.operator === 'lte') {
    const left = typeof current === 'number' ? current : Number(current)
    const right = Number(expected)
    if (!Number.isFinite(left) || !Number.isFinite(right)) return false
    if (condition.operator === 'gt') return left > right
    if (condition.operator === 'gte') return left >= right
    if (condition.operator === 'lt') return left < right
    return left <= right
  }

  let equal: boolean
  if (typeof current === 'boolean' && /^(true|false)$/i.test(expected)) {
    equal = current === (expected.toLowerCase() === 'true')
  } else if (typeof current === 'number' && expected.trim() !== '' && Number.isFinite(Number(expected))) {
    equal = current === Number(expected)
  } else {
    equal = String(current ?? '') === expected
  }
  return condition.operator === 'ne' ? !equal : equal
}

function conditionsPass(item: PluginConfigSchemaItem, effect: 'visible' | 'enabled', values: PluginConfigMap) {
  return (item.conditions ?? [])
    .filter(condition => condition.effect === effect)
    .every(condition => !Object.prototype.hasOwnProperty.call(values, condition.field) || conditionMatches(condition, values))
}

/** `协议：0=Base64，1=File（默认），2=Http。` → options + the lead-in text */
function splitEnum(description: string) {
  const pattern = /(\d+)\s*[=＝]\s*([^，,。；;、\s]+)/g
  const options: EnumOption[] = []
  for (const match of description.matchAll(pattern)) {
    options.push({ value: Number(match[1]), label: match[2].replace(/[（(][^）)]*[）)]/g, '').trim() })
  }
  if (options.length < 2) return { options: null, rest: description }
  const firstIndex = description.search(/\d+\s*[=＝]/)
  const rest = description.slice(0, firstIndex).replace(/[：:，,\s]+$/, '').trim()
  return { options, rest }
}

/** Whether a field needs the full row width (long text, lists, nested objects). */
export function isWideField(item: PluginConfigSchemaItem, value: unknown) {
  return !SCALAR_TYPES.has(item.type) || Array.isArray(value) || isConfigObject(value)
}

/** A display field for one schema item, evaluated against its sibling values. */
export function createConfigField(item: PluginConfigSchemaItem, values: PluginConfigMap): ConfigField {
  const { group: _group, groupLabel: _label, groupOrder: _order, ...field } = toField(item, values)
  return field
}

export function isFieldVisible(item: PluginConfigSchemaItem, values: PluginConfigMap) {
  return conditionsPass(item, 'visible', values)
}

function toField(item: PluginConfigSchemaItem, values: PluginConfigMap): ConfigField & { group: string; groupLabel: string; groupOrder: number } {
  const { group, groupLabel, label } = splitGroup(item)
  const description = item.description ?? ''
  const numericSelectOptions = item.type === 'select' && typeof values[item.key] === 'number'
    ? (item.options ?? []).map((option, index) => ({ value: index, label: String(option) }))
    : null
  const { options, rest } = item.type === 'number' || item.type === 'integer'
    ? splitEnum(description)
    : { options: null, rest: description }
  // After the enum is lifted out, what remains is often just the label again; drop it then.
  const trimmed = rest.replace(/[。.]$/, '').trim()
  return {
    item,
    group,
    groupLabel,
    groupOrder: item.group_order ?? Number.MAX_SAFE_INTEGER,
    label,
    description: trimmed === label ? '' : rest,
    enumOptions: numericSelectOptions?.length ? numericSelectOptions : options,
    enabled: conditionsPass(item, 'enabled', values)
  }
}

/** What is being configured. Adapters share the schema/config shape but have no routes. */
export type ConfigTarget = 'plugin' | 'adapter'

/**
 * Load / edit / save one plugin's (or adapter's) config, plus a plugin's routes. Shared by
 * the config dialog (workspace) and the full config page.
 */
export function usePluginConfig(pluginId: Ref<string>, target: MaybeRefOrGetter<ConfigTarget> = 'plugin') {
  // The config workspace can switch between a plugin and an adapter in place, so the
  // target is reactive too.
  const hasRoutes = computed(() => toValue(target) === 'plugin')
  const noun = computed(() => hasRoutes.value ? '插件' : '适配器')
  const loading = ref(false)
  const saving = ref(false)
  const loadError = ref('')
  const saveMessage = ref('')
  const saveMessageType = ref<'success' | 'error'>('success')
  // Replaced wholesale on every load; a shallow ref also keeps the recursive schema type tractable.
  const schema = shallowRef<PluginConfigSchemaItem[]>([])
  // Typed as the plain map: Vue's deep reactive type does not terminate on the recursive config value type.
  const config: PluginConfigMap = reactive({})
  const routes = reactive<PluginRoutesConfig>({ ...emptyRoutes })
  const routeGroups = ref<string[]>([])
  const snapshot = ref('')

  const groups = computed<ConfigGroup[]>(() => {
    const byOrder = (left: ConfigField, right: ConfigField) =>
      (left.item.order ?? Number.MAX_SAFE_INTEGER) - (right.item.order ?? Number.MAX_SAFE_INTEGER)
    const byGroup = new Map<string, { label: string; order: number; fields: ConfigField[] }>()
    // A top-level section with known fields gets its own category instead of one giant row.
    const sections: Array<ConfigGroup & { section: true }> = []
    for (const item of schema.value) {
      if (!conditionsPass(item, 'visible', config)) continue
      if (item.type === 'section' && item.fields?.length) {
        const values = isConfigObject(config[item.key]) ? config[item.key] as PluginConfigMap : {}
        const { label } = splitGroup(item)
        sections.push({
          key: `section:${item.key}`,
          label,
          description: item.description ?? '',
          order: item.group_order ?? Number.MAX_SAFE_INTEGER,
          parentKey: item.key,
          section: true,
          fields: item.fields
            .filter(child => conditionsPass(child, 'visible', values))
            .map(child => createConfigField(child, values))
            .sort(byOrder)
        })
        continue
      }
      const field = toField(item, config)
      const group = byGroup.get(field.group) ?? {
        label: field.groupLabel,
        order: field.groupOrder,
        fields: []
      }
      group.fields.push(field)
      byGroup.set(field.group, group)
    }
    const plain: ConfigGroup[] = [...byGroup.entries()]
      .map(([key, group]) => ({ key, label: group.label, order: group.order, fields: group.fields.sort(byOrder) }))
    // Stable sort: explicit category order first, then plain groups before section categories.
    return [...plain, ...sections.map(({ section: _section, ...group }) => group)]
      .sort((left, right) => left.order - right.order)
  })

  const currentState = () => JSON.stringify({ config, mode: routes.mode, groups: routeGroups.value })
  const dirty = computed(() => Boolean(snapshot.value) && currentState() !== snapshot.value)

  function markClean() {
    snapshot.value = currentState()
  }

  function applyConfig(next: PluginConfigMap) {
    Object.keys(config).forEach(key => delete config[key])
    Object.assign(config, next)
  }

  function applyRoutes(next: PluginRoutesConfig) {
    Object.assign(routes, { ...emptyRoutes, ...next })
    // Older hosts sent numbers; keep everything as strings
    routeGroups.value = normalizeIdTags(routes.groups.map(String))
  }

  function assignResponse(response: PluginConfigResponse) {
    schema.value = response.schema?.length ? response.schema : createFallbackSchema(response.config)
    applyConfig(withSchemaDefaults(response.config, schema.value))
    applyRoutes(response.routes)
  }

  function assignUpdateResponse(response: PluginConfigUpdateResponse) {
    if (response.schema) schema.value = response.schema.length ? response.schema : createFallbackSchema(response.config ?? config)
    if (response.config) applyConfig(withSchemaDefaults(response.config, schema.value))
    if (response.routes) applyRoutes(response.routes)
  }

  async function load() {
    if (!pluginId.value) return
    loading.value = true
    loadError.value = ''
    saveMessage.value = ''
    snapshot.value = ''
    try {
      if (hasRoutes.value) {
        assignResponse(await getPluginConfig(pluginId.value))
      } else {
        const response = await getAdapterConfig(pluginId.value)
        schema.value = response.schema?.length ? response.schema : createFallbackSchema(response.config)
        applyConfig(withSchemaDefaults(response.config, schema.value))
      }
      markClean()
    } catch (error) {
      applyConfig({})
      schema.value = []
      applyRoutes({ ...emptyRoutes })
      loadError.value = getApiErrorMessage(error, `${noun.value}配置读取失败`)
    } finally {
      loading.value = false
    }
  }

  async function save() {
    saving.value = true
    saveMessage.value = ''
    try {
      if (hasRoutes.value) {
        const response = await updatePluginConfig(pluginId.value, {
          config: { ...config },
          routes: { mode: routes.mode, groups: routeGroups.value }
        })
        if (response) assignUpdateResponse(response)
        else await load()
        saveMessage.value = applyStatusMessage(response?.config_apply_status)
      } else {
        const response = await updateAdapterConfig(pluginId.value, { ...config })
        if (response?.config) applyConfig(response.config)
        else await load()
        saveMessage.value = applyStatusMessage(response?.apply_status)
      }
      markClean()
      saveMessageType.value = 'success'
      saveMessage.value ||= '配置已保存'
      return true
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 &&
          error.body && typeof error.body === 'object' && 'saved' in error.body &&
          (error.body as { saved?: unknown }).saved === true) {
        // A component may reject live application after the host has persisted the patch.
        // Re-read so the form reflects the server's stored value, not the submitted draft.
        await load()
      }
      saveMessageType.value = 'error'
      saveMessage.value = getApiErrorMessage(error, `${noun.value}配置保存失败`)
      return false
    } finally {
      saving.value = false
    }
  }

  function applyStatusMessage(status?: string) {
    if (status === 'applied') return '配置已保存并应用'
    if (status === 'pending_start') return '配置已保存，将在组件启动时应用'
    if (status === 'legacy_saved_only') return '配置已保存；此旧版组件未热更新'
    return ''
  }

  function discard() {
    void load()
  }

  watch([pluginId, () => toValue(target)], () => { void load() }, { immediate: true })

  return {
    hasRoutes,
    loading,
    saving,
    loadError,
    saveMessage,
    saveMessageType,
    schema,
    groups,
    config,
    routes,
    routeGroups,
    dirty,
    load,
    save,
    discard
  }
}
