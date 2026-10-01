<template>
  <div class="logs-page">
    <!-- Where the lines come from -->
    <nav class="source-rail panel" aria-label="日志来源">
      <h3>来源</h3>
      <template v-for="group in [{ kind: 'all', label: '', items: [allSources] }, ...sourceGroups]" :key="group.kind">
        <h4 v-if="group.label" class="source-group">{{ group.label }}</h4>
        <button
          v-for="source in group.items"
          :key="source.key"
          type="button"
          class="source-item"
          :class="{ selected: activeSource === source.key }"
          :aria-current="activeSource === source.key ? 'true' : undefined"
          @click="activeSource = source.key"
        >
          <span class="source-text">
            <strong>{{ source.label }}</strong>
            <small v-if="source.description">{{ source.description }}</small>
          </span>
          <span class="source-count">
            <span v-if="source.errors" class="status-dot error" :title="`${source.errors} 条未查看的错误`" aria-hidden="true"></span>
            <span class="count">{{ source.count }}</span>
          </span>
        </button>
      </template>
    </nav>

    <section class="stream panel">
      <header class="stream-head">
        <div class="stream-title">
          <h2>{{ activeSource === 'ALL' ? '全部日志' : activeSourceLabel }}</h2>
          <p>
            <span class="status-dot" :class="stateTone" aria-hidden="true"></span>{{ streamStateLabels[streamState] }}
            <span class="sep">·</span>{{ filteredLogs.length }} 条
            <template v-if="runtimeLogs.length >= 1000"><span class="sep">·</span>仅保留最近 1000 条</template>
          </p>
        </div>
        <div class="button-group">
          <button type="button" class="md-button tonal" @click="autoRefresh = !autoRefresh">
            <MdIcon :name="autoRefresh ? 'pause' : 'play_arrow'" />{{ autoRefresh ? '暂停' : '继续' }}
          </button>
          <button type="button" class="md-button tonal icon-only" title="重新连接" aria-label="重新连接" @click="refreshLogs">
            <MdIcon name="refresh" />
          </button>
          <button type="button" class="md-button tonal icon-only" title="导出当前显示的日志" aria-label="导出" :disabled="!filteredLogs.length" @click="exportLogs">
            <MdIcon name="download" />
          </button>
          <button type="button" class="md-button tonal icon-only" title="清屏（不影响后端日志）" aria-label="清屏" :disabled="!runtimeLogs.length" @click="clearLogs">
            <MdIcon name="delete" />
          </button>
        </div>
      </header>

      <div class="stream-filters">
        <label class="search-field">
          <MdIcon name="search" />
          <input v-model="keyword" type="search" placeholder="搜索日志内容或来源" />
        </label>
        <div class="button-group" role="radiogroup" aria-label="级别">
          <button
            v-for="option in levelOptions"
            :key="option.value"
            type="button"
            role="radio"
            class="md-button compact toggle"
            :class="{ selected: activeLevel === option.value }"
            :aria-checked="activeLevel === option.value"
            @click="activeLevel = option.value"
          >
            {{ option.label }}<span class="toggle-count">{{ levelCounts[option.value] }}</span>
          </button>
        </div>
      </div>

      <p v-if="loadError && streamState !== 'live'" class="stream-error">
        <MdIcon name="error" />{{ loadError }}，{{ autoRefresh ? '每 2 秒自动重试' : '点击继续后重试' }}。
      </p>

      <div class="stream-body">
        <div ref="scroller" class="stream-lines" :class="{ 'with-source': activeSource === 'ALL' }" role="log" aria-live="polite" @scroll="onScroll">
          <div
            v-for="log in filteredLogs"
            :key="log.id"
            class="line"
            :class="`level-${log.level.toLowerCase()}`"
          >
            <time>{{ log.time }}</time>
            <span class="level">{{ levelLabels[log.level] }}</span>
            <button
              v-if="activeSource === 'ALL'"
              type="button"
              class="source"
              :title="`只看 ${log.source}`"
              @click="activeSource = log.source"
            >{{ log.source === 'system' ? 'System' : log.source }}</button>
            <span class="message"><template v-for="(part, index) in highlight(log.message)" :key="index"><mark v-if="part.hit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
          </div>

          <div v-if="!filteredLogs.length" class="stream-empty">
            <MdIcon :name="runtimeLogs.length ? 'search' : 'code'" />
            <strong>{{ emptyTitle }}</strong>
            <span>{{ emptyHint }}</span>
          </div>
        </div>

        <button v-if="unseen > 0" type="button" class="jump-latest" @click="jumpToLatest">
          <MdIcon name="arrow_downward" />{{ unseen }} 条新日志
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import MdIcon from '../../components/MdIcon.vue'
import type { LogLevel } from '../../features/logs/types'
import { levelOptions, streamStateLabels, useLogsPage } from './Logs'

const {
  keyword,
  normalizedKeyword,
  activeLevel,
  activeSource,
  activeSourceLabel,
  sourceGroups,
  allSources,
  autoRefresh,
  streamState,
  loadError,
  runtimeLogs,
  filteredLogs,
  levelCounts,
  refreshLogs,
  clearLogs,
  exportLogs
} = useLogsPage()

const levelLabels: Record<LogLevel, string> = {
  LOG: '日志',
  INFO: '信息',
  SUCCESS: '成功',
  WARN: '警告',
  ERROR: '错误'
}

const stateTone = computed(() => ({
  live: 'success',
  connecting: 'warning',
  reconnecting: 'error',
  paused: ''
})[streamState.value])

const emptyTitle = computed(() => {
  if (runtimeLogs.value.length) return '没有匹配的日志'
  if (streamState.value === 'paused') return '日志已暂停'
  return streamState.value === 'live' ? '还没有日志' : '正在等待日志流'
})

const emptyHint = computed(() => {
  if (runtimeLogs.value.length) return '换个关键词，或放宽级别和来源筛选。'
  if (streamState.value === 'paused') return '点击「继续」重新接收日志。'
  return '主程序产生的新日志会实时出现在这里。'
})

/** Splits text around the search term so matches can be marked */
function highlight(text: string) {
  const needle = normalizedKeyword.value
  if (!needle) return [{ text, hit: false }]
  const parts: Array<{ text: string; hit: boolean }> = []
  const lower = text.toLowerCase()
  let from = 0
  for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, from)) {
    if (at > from) parts.push({ text: text.slice(from, at), hit: false })
    parts.push({ text: text.slice(at, at + needle.length), hit: true })
    from = at + needle.length
  }
  if (from < text.length) parts.push({ text: text.slice(from), hit: false })
  return parts
}

// ---------- follow the tail ----------

const scroller = ref<HTMLElement | null>(null)
const following = ref(true)
// Last line the reader has seen at the bottom; anything newer counts as unseen while scrolled up.
const seenId = ref(0)
const unseen = computed(() => following.value ? 0 : filteredLogs.value.filter(log => log.id > seenId.value).length)

function markSeen() {
  seenId.value = filteredLogs.value.at(-1)?.id ?? 0
}

function scrollToBottom(smooth = false) {
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
}

function onScroll() {
  const element = scroller.value
  if (!element) return
  following.value = element.scrollHeight - element.scrollTop - element.clientHeight < 32
  if (following.value) markSeen()
}

function jumpToLatest() {
  following.value = true
  markSeen()
  scrollToBottom(true)
}

// New lines keep the view pinned to the bottom unless the reader has scrolled up.
watch(() => filteredLogs.value.at(-1)?.id, async () => {
  if (!following.value) return
  markSeen()
  await nextTick()
  scrollToBottom()
})

// A new filter is a new view: start from the latest line again.
watch([activeSource, activeLevel, normalizedKeyword], async () => {
  following.value = true
  markSeen()
  await nextTick()
  scrollToBottom()
})
</script>

<style scoped src="./Logs.css"></style>
