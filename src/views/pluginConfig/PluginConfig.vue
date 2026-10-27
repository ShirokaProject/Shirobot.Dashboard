<template>
  <div class="config-page">
    <!--
      Config workspace: everything configurable on the left (plugins + adapters), the chosen
      one's editor on the right. Switching stays on this page.
    -->
    <!-- Everything configurable -->
    <nav class="page-targets panel" aria-label="配置对象">
      <div class="targets-head">
        <button type="button" class="md-button text icon-only compact" :aria-label="backLabel" :title="backLabel" @click="goBack">
          <MdIcon name="arrow_back" />
        </button>
        <strong>配置</strong>
      </div>
      <template v-for="section in targetSections" :key="section.kind">
        <h3>{{ section.label }}<span>{{ section.items.length }}</span></h3>
        <ul class="target-list">
          <li v-for="item in section.items" :key="`${section.kind}-${item.id}`">
            <button
              type="button"
              class="target-item"
              :class="{ selected: target === section.kind && pluginId === item.id }"
              :aria-current="target === section.kind && pluginId === item.id ? 'page' : undefined"
              @click="switchTo(section.kind, item.id)"
            >
              <span class="target-name">{{ item.name }}</span>
              <span class="status-dot" :class="item.tone" :title="item.status" aria-hidden="true"></span>
            </button>
          </li>
          <li v-if="!section.items.length" class="target-empty">暂无</li>
        </ul>
      </template>
    </nav>

    <!-- The chosen one: header, then its categories | fields -->
    <section class="page-editor panel">
      <header class="page-head">
        <div class="head-title">
          <h2>{{ currentName }}</h2>
          <p>{{ target === 'adapter' ? '适配器配置' : '插件配置' }}<span class="sep">·</span><span class="mono">{{ pluginId }}</span></p>
        </div>
        <span v-if="dirty" class="head-state"><span class="status-dot warning" aria-hidden="true"></span>有未保存的修改</span>
        <!-- A failure's reason is in the toast; repeating it here would crowd the title. -->
        <span v-else-if="saveMessage && !rawMode" class="head-state" :class="saveMessageType" :title="saveMessage">
          <span v-if="saveMessageType === 'error'" class="status-dot error" aria-hidden="true"></span>{{ saveMessageType === 'error' ? '保存失败' : saveMessage }}
        </span>
        <button v-if="rawConfigAvailable || rawMode" type="button" class="md-button text raw-toggle" @click="toggleRawMode">
          <MdIcon :name="rawMode ? 'settings' : 'code'" />{{ rawMode ? '表单编辑' : '编辑 config.toml' }}
        </button>
        <div class="button-group">
          <button type="button" class="md-button tonal" :disabled="!dirty || busy" @click="discard">放弃修改</button>
          <button type="button" class="md-button filled" :disabled="!dirty || busy" @click="save">保存</button>
        </div>
      </header>

      <!-- Raw config.toml: every key in the file, including ones the form does not describe -->
      <div v-if="rawMode" class="page-raw">
        <p v-if="raw.loading.value && !raw.content.value" class="page-note">正在读取 config.toml…</p>
        <RawConfigEditor v-else v-model="raw.content.value" :error="raw.error.value" :readonly="raw.saving.value" />
      </div>
      <p v-else-if="loadError" class="page-note error">{{ loadError }}</p>
      <p v-else-if="loading" class="page-note">正在读取配置…</p>
      <div v-else class="page-body">
        <ConfigNav
          v-model:view="view"
          class="page-nav"
          :groups="groups"
          :show-routes="hasRoutes"
          :show-listeners="hasRoutes && listeners !== undefined"
        />
        <div class="page-main">
          <PluginConfigForm
            v-model:route-groups="routeGroups"
            :view="view"
            :groups="groups"
            :config="config"
            :routes="routes"
            :listeners="listeners"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MdIcon from '../../components/MdIcon.vue'
import { getAdapters, getInstalledPlugins, type AdapterStatus } from '../../api'
import type { Plugin } from '../../features/plugins/types'
import ConfigNav from './components/ConfigNav.vue'
import PluginConfigForm from './components/PluginConfigForm.vue'
import RawConfigEditor from './components/RawConfigEditor.vue'
import { usePluginConfigPage } from './PluginConfig'
import { ROUTES_VIEW, applyStatusMessage, type ConfigTarget } from './usePluginConfig'
import { useRawConfig } from './useRawConfig'

const router = useRouter()
const {
  pluginId,
  target,
  hasRoutes,
  listeners,
  rawConfigAvailable,
  loading,
  saving,
  loadError,
  saveMessage,
  saveMessageType,
  groups,
  config,
  routes,
  routeGroups,
  dirty: formDirty,
  load: loadForm,
  save: saveForm,
  discard: discardForm
} = usePluginConfigPage()

// Editing config.toml as text instead of the form; each target starts on the form.
const raw = useRawConfig(pluginId, target)
const rawMode = ref(false)
watch([pluginId, target], () => { rawMode.value = false })
const dirty = computed(() => rawMode.value ? raw.dirty.value : formDirty.value)
const busy = computed(() => rawMode.value ? raw.saving.value : saving.value)

async function toggleRawMode() {
  if (!(await confirmDiscard())) return
  rawMode.value = !rawMode.value
  // Leaving the text editor drops discarded form edits and shows what it saved.
  await (rawMode.value ? raw.load() : loadForm())
}

async function save() {
  if (!rawMode.value) return saveForm()
  const status = await raw.save()
  if (status !== null) ElMessage.success(applyStatusMessage(status) || '配置已保存')
}

function discard() {
  void (rawMode.value ? raw.load() : discardForm())
}

// ---------- everything configurable ----------

const plugins = ref<Plugin[]>([])
const adapters = ref<AdapterStatus[]>([])

onMounted(async () => {
  // Either list failing just leaves that section empty; the editor still works.
  const [pluginResult, adapterResult] = await Promise.allSettled([getInstalledPlugins(), getAdapters()])
  if (pluginResult.status === 'fulfilled') plugins.value = pluginResult.value
  if (adapterResult.status === 'fulfilled') adapters.value = adapterResult.value
})

const targetSections = computed(() => [
  {
    kind: 'plugin' as ConfigTarget,
    label: '插件',
    items: plugins.value.map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      tone: plugin.status === 'error' ? 'error' : plugin.status === 'enabled' ? 'success' : '',
      status: { enabled: '启用', disabled: '关闭', error: '错误' }[plugin.status]
    }))
  },
  {
    kind: 'adapter' as ConfigTarget,
    label: '适配器',
    items: adapters.value.map(adapter => ({
      id: adapter.id,
      name: adapter.name,
      tone: adapter.error ? 'error' : adapter.loaded ? 'success' : '',
      status: adapter.error ? '异常' : adapter.loaded ? '运行中' : '已停止'
    }))
  }
])

const currentName = computed(() => {
  const list = target.value === 'adapter' ? adapters.value : plugins.value
  return list.find(item => item.id === pluginId.value)?.name ?? pluginId.value
})

const backLabel = computed(() => target.value === 'adapter' ? '返回适配器' : '返回插件')

// ---------- switching ----------

async function confirmDiscard() {
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm('修改还没有保存，切换或离开后会丢失。', '放弃修改？', {
      confirmButtonText: '放弃修改',
      cancelButtonText: '继续编辑',
      confirmButtonClass: 'el-button--danger'
    })
    return true
  } catch {
    return false
  }
}

// Unsaved-changes check happens here, before navigating: route guards don't reliably
// fire when the same component instance moves between the plugin and adapter routes.
let confirmedSwitch = false
async function switchTo(kind: ConfigTarget, id: string) {
  if (kind === target.value && id === pluginId.value) return
  if (!(await confirmDiscard())) return
  confirmedSwitch = true
  await router.replace(`/${kind === 'adapter' ? 'adapters' : 'plugins'}/${encodeURIComponent(id)}/config`)
  confirmedSwitch = false
}

// Current category: a group key or ROUTES_VIEW; reset per target, first group once loaded.
const view = ref('')
watch([pluginId, target], () => { view.value = '' })
watch(groups, list => {
  // Still loading: leave the choice for when the groups arrive.
  if (!list.length) return
  if ((view.value === ROUTES_VIEW && hasRoutes.value) || list.some(group => group.key === view.value)) return
  view.value = list[0].key
}, { immediate: true })

function goBack() {
  void router.push(target.value === 'adapter' ? '/adapters' : '/plugins')
}

onBeforeRouteLeave(async () => confirmedSwitch || confirmDiscard())
</script>

<style scoped src="./PluginConfig.css"></style>
