<template>
  <div class="config-form">
    <!-- Adapter instance: name and ID, laid out like any other category -->
    <section v-if="view === INSTANCE_VIEW && instance" class="group">
      <h3 class="group-title">实例<span>{{ instanceFields.length }} 项</span></h3>
      <div class="group-card">
        <ConfigFieldRow
          v-for="field in instanceFields"
          :key="field.item.key"
          :field="field"
          id-prefix="instance"
          :model-value="instance[field.item.key as 'id' | 'name']"
          @update:model-value="emit('update:instance', { ...instance, [field.item.key]: String($event ?? '') })"
        />
      </div>
      <p v-if="instanceError" class="instance-error">{{ instanceError }}</p>
    </section>

    <!-- What the plugin registered; read-only, reported by the running plugin -->
    <template v-else-if="view === LISTENERS_VIEW">
      <div v-if="!listeners" class="form-empty">
        <MdIcon name="hearing" />
        <strong>插件未运行</strong>
        <span>启用插件后可查看它注册的命令和事件。</span>
      </div>
      <div v-else-if="!listenerSections.length" class="form-empty">
        <MdIcon name="hearing" />
        <strong>这个插件没有注册监听</strong>
      </div>
      <section v-for="section in listenerSections" v-else :key="section.scope" class="group">
        <h3 class="group-title">{{ section.scope }}<span>{{ section.rows.length }} 项</span></h3>
        <div class="group-card">
          <div v-for="(row, index) in section.rows" :key="index" class="listener-row">
            <span>{{ row.text }}</span>
            <code v-if="row.code" class="listener-code">{{ row.code }}</code>
          </div>
        </div>
      </section>
    </template>

    <template v-else-if="view !== ROUTES_VIEW">
      <div v-if="!groups.length" class="form-empty">
        <MdIcon name="settings" />
        <strong>这个插件没有可配置项</strong>
      </div>

      <!-- One category at a time; the navigator on the left picks which -->
      <section v-for="group in visibleGroups" :key="group.key" class="group">
        <h3 class="group-title">{{ group.label }}<span>{{ group.fields.length }} 项</span></h3>
        <p v-if="group.description" class="group-desc">{{ group.description }}</p>
        <div class="group-card">
          <ConfigFieldRow
            v-for="field in group.fields"
            :key="field.item.key"
            :field="field"
            :id-prefix="group.parentKey ? `cfg-${group.parentKey}` : undefined"
            :model-value="valuesOf(group)[field.item.key]"
            @update:model-value="setValue(group, field.item.key, $event)"
          />
        </div>
      </section>
    </template>

    <template v-else>
      <section class="group">
        <h3 class="group-title">路由<span>生效范围</span></h3>
        <div class="group-card">
          <div class="route-row">
            <div>
              <strong>路由模式</strong>
              <p>决定插件在哪些群组里响应消息。</p>
            </div>
            <div class="button-group" role="radiogroup" aria-label="路由模式">
              <button
                v-for="mode in routeModes"
                :key="mode.value"
                type="button"
                role="radio"
                class="md-button compact toggle"
                :class="{ selected: routes.mode === mode.value }"
                :aria-checked="routes.mode === mode.value"
                @click="routes.mode = mode.value"
              >{{ mode.label }}</button>
            </div>
          </div>

          <div v-if="routes.mode !== 'default'" class="route-groups">
            <label for="route-groups"><strong>{{ routes.mode === 'whitelist' ? '只在这些群组生效' : '在这些群组不生效' }}</strong></label>
            <DirectoryPicker
              kind="groups"
              input-id="route-groups"
              :model-value="routeGroups"
              @update:model-value="emit('update:routeGroups', normalizeIdTags($event))"
            />
          </div>
        </div>

        <div v-if="routes.declared_priority !== undefined" class="group-card priority-card">
          <div class="route-row">
            <div>
              <strong>优先级</strong>
              <p>数字越小越先收到消息；被处理的消息不再交给数字更大的插件。插件声明为 {{ routes.declared_priority }}。</p>
            </div>
            <div class="priority-controls">
              <el-input-number
                id="route-priority"
                class="number-input"
                aria-label="优先级"
                :model-value="routes.priority"
                :step="1"
                :step-strictly="true"
                @update:model-value="setPriority"
              />
              <button
                type="button"
                class="md-button compact text"
                :disabled="!routes.priority_configured"
                @click="resetPriority"
              >恢复插件默认</button>
            </div>
          </div>
        </div>

        <!-- What actually applies right now, merged in from the old side panel -->
        <dl class="effective">
          <div><dt>当前生效</dt><dd>{{ modeLabel(routes.effective_mode) }}</dd></div>
          <div><dt>生效群组</dt><dd>{{ routes.effective_groups.length ? routes.effective_groups.join(', ') : '无' }}</dd></div>
          <div><dt>全局默认</dt><dd>{{ modeLabel(routes.default_mode) }}</dd></div>
          <div><dt>全局默认群组</dt><dd>{{ routes.default_groups.length ? routes.default_groups.join(', ') : '无' }}</dd></div>
          <div><dt>单独配置</dt><dd>{{ routes.configured ? '是' : '否，沿用全局默认' }}</dd></div>
          <div v-if="routes.declared_priority !== undefined"><dt>优先级来源</dt><dd>{{ routes.priority_configured ? '单独设置' : '插件声明' }}</dd></div>
        </dl>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MdIcon from '../../../components/MdIcon.vue'
import type { PluginConfigMap, PluginConfigValue, PluginListeners, PluginRoutesConfig } from '../../../api'
import { INSTANCE_VIEW, LISTENERS_VIEW, ROUTES_VIEW, isConfigObject, type ConfigField, type ConfigGroup } from '../usePluginConfig'
import { groupPluginListeners } from '../../../features/plugins/listeners'
import ConfigFieldRow from './ConfigFieldRow.vue'
import { normalizeIdTags } from '../../../features/idTags'
import DirectoryPicker from '../../../components/DirectoryPicker.vue'

const props = defineProps<{
  /** A group key, or ROUTES_VIEW */
  view: string
  groups: ConfigGroup[]
  config: PluginConfigMap
  routes: PluginRoutesConfig
  routeGroups: string[]
  /** Adapter instance name / ID drafts, shown under INSTANCE_VIEW */
  instance?: { id: string; name: string } | null
  instanceError?: string
  /** Shown under LISTENERS_VIEW; null when the plugin is not loaded */
  listeners?: PluginListeners | null
}>()

const listenerSections = computed(() => props.listeners ? groupPluginListeners(props.listeners) : [])

const instanceFields = computed<ConfigField[]>(() => [
  { item: { key: 'name', label: '名称', type: 'string', placeholder: props.instance?.id }, label: '名称', description: '在列表和日志中显示，留空则使用实例 ID。', enabled: true, enumOptions: null },
  { item: { key: 'id', label: '实例 ID', type: 'string' }, label: '实例 ID', description: '全局唯一。修改后运行中的实例会重新启动。', enabled: true, enumOptions: null }
])

const visibleGroups = computed(() => {
  const match = props.groups.find(group => group.key === props.view)
  return match ? [match] : props.groups.slice(0, 1)
})

const emit = defineEmits<{
  'update:routeGroups': [value: string[]]
  'update:instance': [value: { id: string; name: string }]
}>()

/** A section category edits the nested object `config[parentKey]`; other categories edit the root. */
function valuesOf(group: ConfigGroup): PluginConfigMap {
  if (!group.parentKey) return props.config
  const section = props.config[group.parentKey]
  return isConfigObject(section) ? section : {}
}

function setValue(group: ConfigGroup, key: string, value: PluginConfigValue) {
  const target = props.config
  if (!group.parentKey) {
    target[key] = value
    return
  }
  if (!isConfigObject(target[group.parentKey])) target[group.parentKey] = {}
  ;(target[group.parentKey] as PluginConfigMap)[key] = value
}

function setPriority(value: number | null | undefined) {
  // Clearing the field means the plugin's own priority again.
  if (typeof value !== 'number') return resetPriority()
  props.routes.priority = value
  props.routes.priority_configured = true
}

function resetPriority() {
  props.routes.priority = props.routes.declared_priority
  props.routes.priority_configured = false
}

const routeModes = [
  { value: 'default', label: '跟随全局' },
  { value: 'blacklist', label: '黑名单' },
  { value: 'whitelist', label: '白名单' }
]

function modeLabel(mode: string) {
  return { blacklist: '黑名单', whitelist: '白名单', default: '跟随全局' }[mode] ?? mode
}
</script>

<style scoped>
.config-form {
  display: flex;
  flex-direction: column;
  gap: var(--md-space-6);
}

.group-title {
  display: flex;
  align-items: baseline;
  gap: var(--md-space-2);
  margin: 0 0 var(--md-space-3) var(--md-space-1);
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-title-medium);
  font-weight: 700;
}

.group-desc {
  margin: calc(var(--md-space-2) * -1) 0 var(--md-space-3) var(--md-space-1);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.instance-error {
  margin: var(--md-space-2) 0 0 var(--md-space-1);
  color: var(--md-sys-color-error);
  font: var(--md-sys-typescale-body-small);
}

.group-title span {
  margin-left: var(--md-space-1);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

/* Inputs sit on the tinted group card, so give them the card's paper color to stand out */
.group-card :deep(.el-input__wrapper),
.group-card :deep(.el-select__wrapper),
.group-card :deep(.el-textarea__inner),
.group-card :deep(.el-input-number .el-input__wrapper),
.group-card :deep(.el-input-tag__wrapper) {
  background: var(--app-card) !important;
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant) !important;
}

.group-card :deep(.el-input__wrapper.is-focus),
.group-card :deep(.el-select__wrapper.is-focused),
.group-card :deep(.el-textarea__inner:focus) {
  box-shadow: inset 0 0 0 2px var(--md-sys-color-primary) !important;
}

.group-card {
  padding: 0 var(--md-space-5);
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--app-inset);
}

.group-card > * + * {
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

.route-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--md-space-3) var(--md-space-6);
  padding: var(--md-space-3) 0;
}

.route-row strong,
.route-groups strong {
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-title-small);
}

.route-row p {
  margin: 2px 0 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.priority-card {
  margin-top: var(--md-space-3);
}

.priority-controls {
  display: flex;
  align-items: center;
  gap: var(--md-space-2);
}

.priority-controls .number-input {
  width: 168px;
}

.route-groups {
  display: flex;
  flex-direction: column;
  gap: var(--md-space-2);
  padding: var(--md-space-3) 0;
}

.listener-row {
  min-height: 44px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--md-space-2);
  padding: var(--md-space-2) 0;
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-body-medium);
}

.listener-code {
  padding: 1px var(--md-space-2);
  border-radius: var(--md-sys-shape-corner-small);
  background: var(--app-card);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-outline-variant);
  font: 400 13px / 20px var(--font-mono);
}

.effective {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--md-space-3) var(--md-space-6);
  margin: var(--md-space-4) var(--md-space-1) 0;
}

.effective dt {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-medium);
}

.effective dd {
  margin: 2px 0 0;
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-body-medium);
}

.form-empty {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--md-space-2);
  color: var(--md-sys-color-on-surface-variant);
}

.form-empty .md-icon {
  width: 48px;
  height: 48px;
  padding: 12px;
  border-radius: var(--md-sys-shape-corner-full);
  background: var(--md-sys-color-surface-container-high);
}

.form-empty strong {
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-title-small);
}

.form-empty > span {
  font: var(--md-sys-typescale-body-small);
}
</style>
