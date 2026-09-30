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
              <span class="target-avatar" aria-hidden="true">{{ item.initials }}</span>
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
        <span class="avatar" aria-hidden="true">{{ currentName.slice(0, 1).toUpperCase() }}</span>
        <div class="head-title">
          <h2>{{ currentName }}</h2>
          <p>{{ target === 'adapter' ? 'Adapter 配置' : '插件配置' }}<span class="sep">·</span><span class="mono">{{ pluginId }}</span></p>
        </div>
        <span v-if="dirty" class="head-state"><span class="status-dot warning" aria-hidden="true"></span>有未保存的修改</span>
        <span v-else-if="saveMessage" class="head-state" :class="saveMessageType">{{ saveMessage }}</span>
        <div class="button-group">
          <button type="button" class="md-button tonal" :disabled="!dirty || saving" @click="discard">放弃修改</button>
          <button type="button" class="md-button filled" :disabled="!dirty || saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
        </div>
      </header>

      <p v-if="loadError" class="page-note error">{{ loadError }}</p>
      <p v-else-if="loading" class="page-note">正在读取配置…</p>
      <div v-else class="page-body">
        <ConfigNav v-model:view="view" class="page-nav" :groups="groups" :show-routes="hasRoutes" />
        <div class="page-main">
          <PluginConfigForm
            v-model:route-groups-input="routeGroupsInput"
            :view="view"
            :groups="groups"
            :config="config"
            :routes="routes"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import MdIcon from '../../components/MdIcon.vue'
import { getAdapters, getInstalledPlugins, type AdapterStatus } from '../../api'
import type { Plugin } from '../../features/plugins/types'
import ConfigNav from './components/ConfigNav.vue'
import PluginConfigForm from './components/PluginConfigForm.vue'
import { usePluginConfigPage } from './PluginConfig'
import { ROUTES_VIEW, type ConfigTarget } from './usePluginConfig'

const router = useRouter()
const {
  pluginId,
  target,
  hasRoutes,
  loading,
  saving,
  loadError,
  saveMessage,
  saveMessageType,
  groups,
  config,
  routes,
  routeGroupsInput,
  dirty,
  save,
  discard
} = usePluginConfigPage()

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
      initials: plugin.name.slice(0, 1).toUpperCase(),
      tone: plugin.status === 'error' ? 'error' : plugin.status === 'enabled' ? 'success' : '',
      status: { enabled: '启用', disabled: '关闭', error: '错误' }[plugin.status]
    }))
  },
  {
    kind: 'adapter' as ConfigTarget,
    label: 'Adapter',
    items: adapters.value.map(adapter => ({
      id: adapter.id,
      name: adapter.name,
      initials: adapter.platform.slice(0, 2).toUpperCase(),
      tone: adapter.error ? 'error' : adapter.loaded ? 'success' : '',
      status: adapter.error ? '异常' : adapter.loaded ? '运行中' : '已停止'
    }))
  }
])

const currentName = computed(() => {
  const list = target.value === 'adapter' ? adapters.value : plugins.value
  return list.find(item => item.id === pluginId.value)?.name ?? pluginId.value
})

const backLabel = computed(() => target.value === 'adapter' ? '返回 Adapter' : '返回插件')

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
