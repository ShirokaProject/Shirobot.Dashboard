<template>
  <article v-if="plugin" class="detail">
    <header class="detail-head">
      <span class="avatar" aria-hidden="true">{{ plugin.name.slice(0, 1).toUpperCase() }}</span>
      <div class="detail-title">
        <h2>{{ plugin.name }}</h2>
        <p>{{ plugin.author }}<span class="sep">·</span>{{ plugin.category }}</p>
      </div>
      <el-switch
        :model-value="plugin.status === 'enabled'"
        :disabled="isToggleLocked(plugin)"
        :aria-label="plugin.status === 'enabled' ? '停用插件' : '启用插件'"
        @change="(value: string | number | boolean) => emit('toggle', plugin!, Boolean(value))"
      />
    </header>

    <p class="detail-desc">{{ plugin.description }}</p>

    <!-- At most one notice: the thing that needs doing -->
    <div v-if="plugin.status === 'error'" class="notice">
      <MdIcon name="error" class="notice-icon error" />
      <div>
        <strong>插件出错</strong>
        <span>{{ plugin.errorMessage || '加载失败，请查看运行日志。' }}</span>
      </div>
    </div>
    <div v-else-if="plugin.hasUpdate" class="notice">
      <MdIcon name="arrow_upward" class="notice-icon accent" />
      <div>
        <strong>可更新到 v{{ plugin.latestVersion }}</strong>
        <span>当前 v{{ plugin.version }}</span>
      </div>
      <button
        type="button"
        class="md-button compact filled"
        :disabled="plugin.status !== 'enabled' || Boolean(hostOperation)"
        @click="emit('update', plugin)"
      >{{ hostOperation === 'update' ? '更新中…' : '更新' }}</button>
    </div>

    <dl class="facts">
      <div><dt>版本</dt><dd class="mono">v{{ plugin.version }}</dd></div>
      <div><dt>状态</dt><dd>{{ statusText(plugin.status) }}</dd></div>
      <div v-if="plugin.permissions.length" class="wide"><dt>权限</dt><dd>{{ plugin.permissions.join(' · ') }}</dd></div>
    </dl>

    <section v-if="actionsLoading || actionsError || extraActions.length" class="actions">
      <h3>插件操作</h3>
      <p v-if="actionsError" class="muted">{{ actionsError }}</p>
      <p v-else-if="actionsLoading" class="muted">加载中…</p>
      <button
        v-for="action in extraActions"
        v-else
        :key="action.id"
        type="button"
        class="action-row"
        :disabled="Boolean(runningActionId) || Boolean(hostOperation)"
        @click="emit('action', plugin, action)"
      >
        <span>
          <strong>{{ action.label }}</strong>
          <small>{{ runningActionId === action.id ? '执行中…' : action.description }}</small>
        </span>
      </button>
    </section>

    <footer class="detail-foot button-group">
      <button type="button" class="md-button tonal" :disabled="Boolean(hostOperation)" @click="emit('openConfig', plugin)">
        <MdIcon name="settings" />配置
      </button>
      <button
        type="button"
        class="md-button tonal danger"
        :disabled="Boolean(hostOperation) || Boolean(runningActionId)"
        @click="emit('delete', plugin)"
      >
        <MdIcon name="delete" />{{ hostOperation === 'delete' ? '卸载中…' : '卸载' }}
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MdIcon from '../../../components/MdIcon.vue'
import type { PluginActionDefinition } from '../../../api'
import type { Plugin, PluginStatus } from '../../../features/plugins/types'

// The pane already offers update / uninstall; hide backend actions that duplicate them.
const HOST_ACTION_IDS = new Set(['update', 'uninstall', 'delete', 'remove'])

const props = defineProps<{
  plugin: Plugin | null
  statusText: (status: PluginStatus) => string
  isToggleLocked: (plugin: Plugin) => boolean
  actions: PluginActionDefinition[]
  actionsLoading: boolean
  actionsError: string
  runningActionId: string
  hostOperation: string
}>()

const emit = defineEmits<{
  toggle: [plugin: Plugin, enabled: boolean]
  openConfig: [plugin: Plugin]
  action: [plugin: Plugin, action: PluginActionDefinition]
  update: [plugin: Plugin]
  delete: [plugin: Plugin]
}>()

const extraActions = computed(() => props.actions.filter(action => !HOST_ACTION_IDS.has(action.id.toLowerCase())))
</script>

<style scoped src="./detail.css"></style>
