<template>
  <div class="config-form">
    <template v-if="view !== ROUTES_VIEW">
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

          <label v-if="routes.mode !== 'default'" class="route-groups">
            <strong>{{ routes.mode === 'whitelist' ? '只在这些群组生效' : '在这些群组不生效' }}</strong>
            <el-input
              :model-value="routeGroupsInput"
              placeholder="群号，用逗号或空格分隔，例如 123456789, 987654321"
              @update:model-value="emit('update:routeGroupsInput', $event)"
            />
          </label>
        </div>

        <!-- What actually applies right now, merged in from the old side panel -->
        <dl class="effective">
          <div><dt>当前生效</dt><dd>{{ modeLabel(routes.effective_mode) }}</dd></div>
          <div><dt>生效群组</dt><dd>{{ routes.effective_groups.length ? routes.effective_groups.join(', ') : '无' }}</dd></div>
          <div><dt>全局默认</dt><dd>{{ modeLabel(routes.default_mode) }}</dd></div>
          <div><dt>单独配置</dt><dd>{{ routes.configured ? '是' : '否，沿用全局默认' }}</dd></div>
        </dl>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MdIcon from '../../../components/MdIcon.vue'
import type { PluginConfigMap, PluginConfigValue, PluginRoutesConfig } from '../../../api'
import { ROUTES_VIEW, isConfigObject, type ConfigGroup } from '../usePluginConfig'
import ConfigFieldRow from './ConfigFieldRow.vue'

const props = defineProps<{
  /** A group key, or ROUTES_VIEW */
  view: string
  groups: ConfigGroup[]
  config: PluginConfigMap
  routes: PluginRoutesConfig
  routeGroupsInput: string
}>()

const visibleGroups = computed(() => {
  const match = props.groups.find(group => group.key === props.view)
  return match ? [match] : props.groups.slice(0, 1)
})

const emit = defineEmits<{ 'update:routeGroupsInput': [value: string] }>()

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

.group-title span {
  margin-left: var(--md-space-1);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

/* Inputs sit on the tinted group card, so give them the card's paper color to stand out */
.group-card :deep(.el-input__wrapper),
.group-card :deep(.el-select__wrapper),
.group-card :deep(.el-textarea__inner),
.group-card :deep(.el-input-number .el-input__wrapper) {
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

.route-groups {
  display: flex;
  flex-direction: column;
  gap: var(--md-space-2);
  padding: var(--md-space-3) 0;
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
</style>
