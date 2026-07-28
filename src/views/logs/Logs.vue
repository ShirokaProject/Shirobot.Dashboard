<template>
  <div class="logs-page">
    <section class="logs-filter-bar">
      <label class="search-container">
        <span class="search-icon" aria-hidden="true">
          <MaterialSymbol name="search" />
        </span>
        <input v-model="keyword" type="search" placeholder="搜索日志内容" aria-label="搜索日志内容" />
      </label>

      <div class="kind-chip-group" role="group" aria-label="日志类型筛选">
        <button
          v-for="option in kindOptions"
          :key="option.value"
          type="button"
          class="md3-chip"
          :aria-pressed="activeKind === option.value"
          @click="setKind(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <button
        type="button"
        class="live-toggle"
        :class="{ active: autoRefresh }"
        :aria-pressed="autoRefresh"
        @click="autoRefresh = !autoRefresh"
      >
        <span class="live-indicator"></span>
        <span>{{ autoRefresh ? (reconnecting ? '重连中…' : '实时') : '暂停' }}</span>
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
          <div
            :ref="(el) => { outputRef = el as HTMLElement | null }"
            class="terminal-output"
            role="log"
            aria-label="运行时日志文本流"
            @scroll="handleOutputScroll"
          >
            <article
              v-for="log in filteredLogs"
              :key="log.id"
              class="terminal-line"
              :class="[log.kind, log.level]"
            >
              <code>{{ log.raw }}</code>
            </article>

            <div v-if="filteredLogs.length === 0" class="terminal-empty">
              暂无运行日志。连接后端后将在此实时显示日志流。
            </div>
          </div>

          <button
            v-if="!stickToBottom"
            type="button"
            class="scroll-bottom-button"
            aria-label="回到底部"
            @click="scrollToBottom"
          >
            ↓ 回到底部
          </button>
        </div>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import MaterialSymbol from '../../components/MaterialSymbol.vue'
import { useLogsPage } from './Logs'

const {
  keyword,
  activeKind,
  activeSource,
  activeLogFileName,
  autoRefresh,
  loadError,
  reconnecting,
  stickToBottom,
  outputRef,
  filteredLogs,
  sourceFilters,
  kindOptions,
  setKind,
  refreshLogs,
  scrollToBottom,
  handleOutputScroll
} = useLogsPage()
</script>

<style scoped src="./Logs.css"></style>
