<template>
  <article v-if="plugin" class="detail">
    <header class="detail-head">
      <div class="detail-title">
        <h2>{{ plugin.name }}</h2>
        <p>{{ plugin.author }}<span class="sep">·</span>{{ plugin.category }}</p>
      </div>
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

    <MarketFacts
      :plugin="marketPlugin"
      :published-at="publishedAt"
      :compatibility="compatibility"
      :version="plugin.version"
      :status="statusText(plugin.status)"
      :permissions="plugin.permissions"
    />

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
import MarketFacts from './MarketFacts.vue'
import type { MarketplacePlugin, PluginActionDefinition } from '../../../api'
import type { Plugin, PluginStatus } from '../../../features/plugins/types'

// The pane already offers update / uninstall; hide backend actions that duplicate them.
const HOST_ACTION_IDS = new Set(['update', 'uninstall', 'delete', 'remove'])

const props = defineProps<{
  plugin: Plugin | null
  marketPlugin: MarketplacePlugin | null
  publishedAt: string
  compatibility: string
  statusText: (status: PluginStatus) => string
  actions: PluginActionDefinition[]
  actionsLoading: boolean
  actionsError: string
  runningActionId: string
  hostOperation: string
}>()

const emit = defineEmits<{
  openConfig: [plugin: Plugin]
  action: [plugin: Plugin, action: PluginActionDefinition]
  update: [plugin: Plugin]
  delete: [plugin: Plugin]
}>()

const extraActions = computed(() => props.actions.filter(action => !HOST_ACTION_IDS.has(action.id.toLowerCase())))
</script>

<style scoped src="./detail.css"></style>
