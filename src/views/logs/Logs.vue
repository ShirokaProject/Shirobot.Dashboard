<template>
  <div class="logs-page">
    <section class="logs-filter-bar">
      <label class="search-container">
        <span class="search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
          </svg>
        </span>
        <input v-model="keyword" type="search" placeholder="搜索日志内容" />
      </label>

      <div class="kind-chip-group" aria-label="日志类型筛选">
        <button
          v-for="option in kindOptions"
          :key="option.value"
          type="button"
          class="kind-chip"
          :class="{ active: activeKind === option.value }"
          @click="setKind(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <button type="button" class="live-toggle" :class="{ active: autoRefresh }" @click="autoRefresh = !autoRefresh">
        <span class="live-indicator"></span>
        <span>{{ autoRefresh ? '实时' : '暂停' }}</span>
      </button>

      <button type="button" class="refresh-button" @click="refreshLogs">刷新</button>
    </section>

    <el-alert
      v-if="loadError"
      class="page-alert"
      :title="loadError"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="logs-layout">
      <aside class="source-panel">
        <div class="section-label">
          <span class="live-dot" :class="{ paused: !autoRefresh }"></span>
          <span>来源</span>
        </div>

        <button
          v-for="source in sourceFilters"
          :key="source.key"
          type="button"
          class="source-item"
          :class="{ active: activeSource === source.key }"
          @click="activeSource = source.key"
        >
          <span class="source-mark">{{ source.short }}</span>
          <span class="source-main">
            <strong>{{ source.label }}</strong>
            <small>{{ source.description }}</small>
          </span>
          <span class="source-count">{{ source.count }}</span>
        </button>
      </aside>

      <main class="log-stream-panel terminal-panel">
        <div class="terminal-tabs" aria-hidden="true">
          <div class="terminal-tab active">
            <span class="terminal-tab-icon">▣</span>
            <strong>{{ activeLogFileName }}</strong>
          </div>
          <div class="terminal-window-spacer"></div>
          <span class="terminal-stream-status">{{ filteredLogs.length }} lines</span>
        </div>

        <div class="terminal-body">
          <div class="terminal-output" role="log" aria-label="运行时日志文本流">
            <article
              v-for="log in filteredLogs"
              :key="log.id"
              class="terminal-line"
              :class="[log.kind, log.level]"
            >
              <code>{{ log.raw }}</code>
            </article>

            <div v-if="filteredLogs.length === 0" class="terminal-empty">
              No runtime logs. Connect backend endpoint /api/v1/logs/stream to show real logs.
            </div>
          </div>
        </div>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useLogsPage } from './Logs'

const {
  keyword,
  activeKind,
  activeSource,
  activeLogFileName,
  autoRefresh,
  loadError,
  filteredLogs,
  sourceFilters,
  kindOptions,
  setKind,
  refreshLogs
} = useLogsPage()
</script>

<style scoped src="./Logs.css"></style>
