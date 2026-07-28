<template>
  <aside class="plugin-detail-pane">
    <template v-if="plugin">
      <!-- Hero: identity only (name / status / meta) — no duplicated info below -->
      <header class="detail-hero">
        <div class="plugin-avatar large" :class="plugin.status" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M20.5 11H19V7.5C19 6.67 18.33 6 17.5 6H14V4.5C14 3.12 12.88 2 11.5 2S9 3.12 9 4.5V6H5.5C4.67 6 4 6.67 4 7.5V11h1.5C6.88 11 8 12.12 8 13.5S6.88 16 5.5 16H4v3.5c0 .83.67 1.5 1.5 1.5H9v-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V21h3.5c.83 0 1.5-.67 1.5-1.5V16h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11Z" />
          </svg>
        </div>
        <div class="hero-text">
          <div class="hero-title-line">
            <h2>{{ plugin.name }}</h2>
            <span class="status-badge" :class="plugin.status">{{ statusText(plugin.status) }}</span>
          </div>
          <p class="hero-description">{{ plugin.description }}</p>
          <p class="hero-meta">{{ plugin.author }} · {{ plugin.category }}</p>
        </div>
        <button type="button" class="detail-close-button" aria-label="关闭详情" @click="emit('close')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.4 19 5 17.6 10.6 12 5 6.4 6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4Z" />
          </svg>
        </button>
      </header>

      <div class="detail-scroll">
        <!-- Group: runtime -->
        <div class="detail-group">
          <div
            class="group-row interactive"
            role="switch"
            :aria-checked="plugin.enabled"
            tabindex="0"
            @click="!isToggleLocked(plugin) && emit('toggle', plugin!, !plugin.enabled)"
            @keydown.enter.prevent="!isToggleLocked(plugin) && emit('toggle', plugin!, !plugin.enabled)"
            @keydown.space.prevent="!isToggleLocked(plugin) && emit('toggle', plugin!, !plugin.enabled)"
          >
            <div class="row-text">
              <strong>运行状态</strong>
              <small>{{ plugin.status === 'error' ? '插件处于错误状态，需要先查看日志或修复。' : '控制插件是否响应事件。' }}</small>
            </div>
            <el-switch
              :model-value="plugin.enabled"
              :disabled="isToggleLocked(plugin)"
              :loading="isTogglePending(plugin)"
              :aria-label="`启停 ${plugin.name}`"
              @click.stop
              @change="(value: string | number | boolean) => emit('toggle', plugin!, Boolean(value))"
            />
          </div>

          <div v-if="plugin.errorMessage" class="group-row error-row">
            <div class="row-text">
              <strong>错误信息</strong>
              <small>{{ plugin.errorMessage }}</small>
            </div>
          </div>
        </div>

        <!-- Group: version -->
        <div class="detail-group" aria-label="版本信息">
          <div class="group-row">
            <div class="row-text">
              <strong>版本</strong>
              <small v-if="plugin.hasUpdate">有新版本可用</small>
            </div>
            <span class="row-value">
              <template v-if="plugin.hasUpdate">
                v{{ plugin.version }}
                <svg class="m3-icon arrow" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m14 18-1.4-1.45L16.15 13H4v-2h12.15L12.6 7.45 14 6l6 6Z" />
                </svg>
                <em>v{{ plugin.latestVersion }}</em>
              </template>
              <template v-else>v{{ plugin.version }}</template>
            </span>
          </div>

          <div v-if="plugin.repository" class="group-row">
            <div class="row-text">
              <strong>项目地址</strong>
              <small>插件源码与项目主页</small>
            </div>
            <a
              class="row-link"
              :href="repositoryHref(plugin.repository)"
              target="_blank"
              rel="noreferrer"
              :title="plugin.repository"
            >
              {{ plugin.repository }}
            </a>
          </div>

          <button
            v-if="plugin.history.length"
            type="button"
            class="group-row interactive"
            :aria-expanded="historyOpen"
            @click="historyOpen = !historyOpen"
          >
            <div class="row-text">
              <strong>历史版本</strong>
            </div>
            <svg class="m3-icon chevron" :class="{ open: historyOpen }" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15.05 6.35 9.4l1.4-1.4L12 12.25 16.25 8l1.4 1.4Z" />
            </svg>
          </button>

          <div v-if="historyOpen" class="group-row history-rows">
            <div v-for="version in plugin.history" :key="version.version" class="history-item">
              <span>v{{ version.version }}</span>
              <span>{{ version.date }}</span>
            </div>
          </div>
        </div>

        <!-- Group: backend-provided actions -->
        <div v-if="actionsError || actionsLoading || actions.length" class="detail-group" aria-label="插件操作">
          <div v-if="actionsError" class="group-row error-row" role="alert">
            <div class="row-text"><strong>插件操作</strong><small>{{ actionsError }}</small></div>
          </div>
          <div v-else-if="actionsLoading" class="group-row">
            <div class="row-text"><strong>插件操作</strong><small>加载中...</small></div>
          </div>
          <button
            v-for="action in actions"
            :key="action.id"
            type="button"
            class="group-row interactive"
            :class="actionToneClass(action.tone)"
            :disabled="Boolean(runningActionId) || Boolean(hostOperation)"
            @click="emit('action', plugin, action)"
          >
            <div class="row-text">
              <strong>{{ action.label }}</strong>
              <small>{{ action.description }}</small>
            </div>
            <span v-if="runningActionId === action.id" class="row-value">执行中...</span>
            <svg v-else class="m3-icon chevron" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9.4 18-1.4-1.4 4.6-4.6-4.6-4.6L9.4 6l6 6Z" />
            </svg>
          </button>
        </div>

        <!-- Group: permissions -->
        <div v-if="plugin.permissions.length" class="detail-group" aria-label="权限">
          <div class="group-row wrap">
            <div class="row-text"><strong>权限</strong></div>
            <div class="permission-list">
              <span v-for="permission in plugin.permissions" :key="permission" class="permission-chip">
                {{ permission }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer bar: quick-settings style (destructive text left, primary actions right) -->
      <footer class="detail-footer">
        <button
          type="button"
          class="footer-button danger-text"
          :disabled="Boolean(hostOperation) || Boolean(runningActionId)"
          @click="emit('delete', plugin)"
        >
          <svg class="m3-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 21a2 2 0 0 1-2-2V6H4V4h5V3h6v1h5v2h-1v13a2 2 0 0 1-2 2Zm2-5h2V8H9Zm4 0h2V8h-2Z" />
          </svg>
          <span>{{ hostOperation === 'delete' ? '卸载中...' : '卸载' }}</span>
        </button>

        <div class="footer-spacer"></div>

        <button
          type="button"
          class="footer-button outlined config-toggle"
          :class="{ active: configOpen }"
          :disabled="Boolean(hostOperation)"
          :aria-pressed="configOpen"
          @click="emit('openConfig', plugin)"
        >
          <span>{{ configOpen ? '关闭配置' : '打开配置' }}</span>
        </button>
        <button
          type="button"
          class="footer-button filled"
          :disabled="!plugin.enabled || !plugin.repository || Boolean(hostOperation) || Boolean(runningActionId)"
          :title="!plugin.repository ? '插件未配置 GithubRepo，无法检查更新' : ''"
          @click="emit('update', plugin)"
        >
          <span>{{ hostOperation === 'update' ? '更新中...' : '更新插件' }}</span>
        </button>
      </footer>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PluginActionDefinition } from '../../../api'
import type { Plugin, PluginStatus } from '../../../features/plugins/types'

defineProps<{
  plugin: Plugin | null
  statusText: (status: PluginStatus) => string
  isToggleLocked: (plugin: Plugin) => boolean
  isTogglePending: (plugin: Plugin) => boolean
  actions: PluginActionDefinition[]
  actionsLoading: boolean
  actionsError: string
  runningActionId: string
  hostOperation: string
  configOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  toggle: [plugin: Plugin, enabled: boolean]
  openConfig: [plugin: Plugin]
  action: [plugin: Plugin, action: PluginActionDefinition]
  update: [plugin: Plugin]
  delete: [plugin: Plugin]
}>()

const historyOpen = ref(false)

function actionToneClass(tone: string) {
  const normalized = tone.toLowerCase()
  if (['danger', 'destructive', 'error'].includes(normalized)) return 'danger'
  if (['warning', 'caution'].includes(normalized)) return 'warning'
  if (['primary', 'accent', 'tonal'].includes(normalized)) return 'primary'
  return 'neutral'
}

function repositoryHref(repository: string) {
  if (/^https?:\/\//i.test(repository)) return repository
  return `https://github.com/${repository.replace(/^\/+/, '')}`
}
</script>

<style scoped src="./PluginDetailPane.css"></style>
