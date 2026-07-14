<template>
  <aside class="plugin-detail-pane">
    <template v-if="plugin">
      <header class="detail-side-header">
        <div class="plugin-avatar large" :class="plugin.status" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M20.5 11H19V7.5C19 6.67 18.33 6 17.5 6H14V4.5C14 3.12 12.88 2 11.5 2S9 3.12 9 4.5V6H5.5C4.67 6 4 6.67 4 7.5V11h1.5C6.88 11 8 12.12 8 13.5S6.88 16 5.5 16H4v3.5c0 .83.67 1.5 1.5 1.5H9v-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V21h3.5c.83 0 1.5-.67 1.5-1.5V16h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11Z" />
          </svg>
        </div>
        <div class="detail-heading">
          <div class="detail-title-line">
            <h2>{{ plugin.name }}</h2>
            <span class="status-badge" :class="plugin.status">{{ statusText(plugin.status) }}</span>
          </div>
          <p>{{ plugin.description }}</p>
        </div>
      </header>

      <div class="detail-side-actions">
        <button type="button" class="detail-action-button tonal" :disabled="Boolean(hostOperation)" @click="emit('openConfig', plugin)">打开配置</button>
        <button
          type="button"
          class="detail-action-button tonal"
          :disabled="plugin.status !== 'enabled' || Boolean(hostOperation) || Boolean(runningActionId)"
          @click="emit('update', plugin)"
        >{{ hostOperation === 'update' ? '更新中...' : '检查更新' }}</button>
        <button
          type="button"
          class="detail-action-button danger"
          :disabled="Boolean(hostOperation) || Boolean(runningActionId)"
          @click="emit('delete', plugin)"
        >{{ hostOperation === 'delete' ? '卸载中...' : '卸载插件' }}</button>
      </div>

      <div class="detail-side-body">
        <section class="detail-section-panel command-panel">
          <div class="detail-card-head compact">
            <div>
              <div class="detail-section-title">插件操作</div>
              <p>操作项由插件后端提供。</p>
            </div>
            <span v-if="actionsLoading" class="action-loading">加载中...</span>
          </div>

          <div v-if="actionsError" class="action-error">{{ actionsError }}</div>
          <div v-else-if="actions.length" class="plugin-command-list">
            <button
              v-for="action in actions"
              :key="action.id"
              type="button"
              class="plugin-command-button"
              :class="actionToneClass(action.tone)"
              :disabled="Boolean(runningActionId) || Boolean(hostOperation)"
              @click="emit('action', plugin, action)"
            >
              <span>
                <strong>{{ action.label }}</strong>
                <small>{{ action.description }}</small>
              </span>
              <span v-if="runningActionId === action.id">执行中...</span>
            </button>
          </div>
          <p v-else-if="!actionsLoading" class="action-empty">该插件没有额外操作。</p>
        </section>

        <section class="detail-section-panel basic-panel">
          <div class="detail-section-title">基础信息</div>
          <dl class="detail-kv-list">
            <div class="detail-kv-row">
              <dt>作者</dt>
              <dd>{{ plugin.author }}</dd>
            </div>
            <div class="detail-kv-row">
              <dt>分类</dt>
              <dd>{{ plugin.category }}</dd>
            </div>
            <div class="detail-kv-row">
              <dt>状态</dt>
              <dd>{{ statusText(plugin.status) }}</dd>
            </div>
          </dl>
        </section>

        <section class="detail-section-panel runtime-panel">
          <div class="detail-card-head">
            <div>
              <div class="detail-section-title">运行状态</div>
              <p>{{ plugin.status === 'error' ? '插件处于错误状态，需要先查看日志或修复。' : '控制插件是否响应事件。' }}</p>
            </div>
            <el-switch
              :model-value="plugin.status === 'enabled'"
              :disabled="isToggleLocked(plugin)"
              @change="(value: string | number | boolean) => emit('toggle', plugin!, Boolean(value))"
            />
          </div>
        </section>

        <section v-if="plugin.errorMessage" class="detail-section-panel error-card">
          <div class="detail-section-title">错误信息</div>
          <div class="error-box">{{ plugin.errorMessage }}</div>
        </section>

        <section class="detail-section-panel version-panel">
          <div class="detail-card-head compact">
            <div class="detail-section-title">版本信息</div>
          </div>

          <dl class="detail-kv-list version-list">
            <div class="detail-kv-row">
              <dt>当前版本</dt>
              <dd>v{{ plugin.version }}</dd>
            </div>
            <div class="detail-kv-row">
              <dt>最新版本</dt>
              <dd>v{{ plugin.latestVersion ?? plugin.version }}</dd>
            </div>
          </dl>

          <div class="version-history">
            <div v-for="version in plugin.history" :key="version.version" class="history-item">
              <span>v{{ version.version }}</span>
              <span>{{ version.date }}</span>
            </div>
          </div>
        </section>

        <section class="detail-section-panel permission-panel">
          <div class="detail-section-title">权限与配置</div>
          <div class="permission-list">
            <span v-for="permission in plugin.permissions" :key="permission" class="md3-chip">
              {{ permission }}
            </span>
          </div>
        </section>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import type { PluginActionDefinition } from '../../../api'
import type { Plugin, PluginStatus } from '../../../features/plugins/types'

defineProps<{
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

function actionToneClass(tone: string) {
  const normalized = tone.toLowerCase()
  if (['danger', 'destructive', 'error'].includes(normalized)) return 'danger'
  if (['warning', 'caution'].includes(normalized)) return 'warning'
  if (['primary', 'accent', 'tonal'].includes(normalized)) return 'primary'
  return 'neutral'
}
</script>

<style scoped src="./PluginDetailPane.css"></style>
