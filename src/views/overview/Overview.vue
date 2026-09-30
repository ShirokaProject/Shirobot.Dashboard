<template>
  <div class="overview-page">
    <el-alert
      v-if="loadError"
      class="page-alert"
      :title="loadError"
      type="warning"
      show-icon
      :closable="false"
    />

    <!-- Greeting card: the page headline (the app bar is untitled here) -->
    <header class="panel hero-card">
      <div class="hero-top">
        <div class="hero-text">
          <h2>{{ greeting }}!<span class="hero-face" aria-hidden="true">{{ greetingFace }}</span></h2>
          <p class="hero-date">{{ dateLabel }}</p>
          <p class="hero-status">
            <MdIcon :name="health.tone === 'error' ? 'error' : 'check_circle'" :class="['hero-status-icon', health.tone]" />
            <span class="hero-status-label">{{ health.label }}</span>
          </p>
        </div>
        <div class="hero-actions button-group" role="group" aria-label="电源">
        <button
          type="button"
          class="md-button tonal"
          :disabled="powerPending !== null"
          @click="confirmPower('restart')"
        >
          <MdIcon name="restart_alt" />
          <span>{{ powerPending === 'restart' ? '重启中…' : '重启' }}</span>
        </button>
        <button
          type="button"
          class="md-button tonal danger"
          :disabled="powerPending !== null"
          @click="confirmPower('shutdown')"
        >
          <MdIcon name="power_settings_new" />
          <span>{{ powerPending === 'shutdown' ? '关机中…' : '关机' }}</span>
        </button>
        </div>
      </div>
      <dl class="hero-facts">
        <div v-for="fact in heroFacts" :key="fact.key" class="hero-fact">
          <dt>{{ fact.label }}</dt>
          <dd>{{ fact.value }}</dd>
        </div>
      </dl>
    </header>

    <div class="overview-layout">
      <div class="main-column">
        <section class="status-grid">
          <article class="panel">
            <div class="panel-head">
              <div>
                <h3>适配器</h3>
                <p>{{ adapters.length ? `${onlineAdapterCount} / ${adapters.length} 个在线` : '平台连接' }}</p>
              </div>
              <router-link class="md-button text" to="/adapters">
                管理<el-icon><ArrowRight /></el-icon>
              </router-link>
            </div>

            <PanelEmpty v-if="adaptersError" :icon="Connection" title="适配器状态不可用" :detail="adaptersError" retry @retry="loadAdapters" />
            <ul v-else-if="adapters.length" class="row-list">
              <li v-for="adapter in adapters" :key="adapter.id" class="adapter-row">
                <div class="row-main">
                  <div class="row-title">
                    <strong>{{ adapter.name }}</strong>
                    <span class="mono muted">v{{ adapter.version }}</span>
                  </div>
                  <div class="row-meta">
                    <span class="status-dot" :class="adapterTone(adapter)" aria-hidden="true"></span>
                    <span>{{ adapterStatusLabel(adapter) }}</span>
                    <span class="sep">·</span>
                    <span>{{ adapter.platform }}</span>
                  </div>
                  <p v-if="adapter.error" class="row-error">{{ adapter.error }}</p>
                </div>
                <button
                  type="button"
                  class="md-button text compact"
                  :disabled="busyAdapterId === adapter.id"
                  @click="toggleAdapter(adapter)"
                >
                  {{ busyAdapterId === adapter.id ? '处理中…' : adapter.loaded ? '停止' : '启动' }}
                </button>
              </li>
            </ul>
            <PanelEmpty v-else :icon="Connection" title="暂无适配器" detail="安装适配器后即可连接聊天平台" />
          </article>

          <article class="panel">
            <div class="panel-head">
              <div>
                <h3>插件</h3>
                <p>{{ pluginSummary.total ? `共 ${pluginSummary.total} 个` : '已安装插件' }}</p>
              </div>
              <router-link class="md-button text" to="/plugins">
                管理<el-icon><ArrowRight /></el-icon>
              </router-link>
            </div>

            <PanelEmpty v-if="pluginsError" :icon="Box" title="插件状态不可用" :detail="pluginsError" retry @retry="loadPlugins" />
            <template v-else-if="pluginSummary.total">
              <div class="plugin-meter" role="img" :aria-label="pluginSummary.segments.map(s => `${s.label} ${s.count}`).join('，')">
                <span
                  v-for="segment in pluginSummary.segments.filter(s => s.count)"
                  :key="segment.key"
                  :class="['meter-segment', segment.tone]"
                  :style="{ flexGrow: segment.count }"
                ></span>
              </div>
              <ul class="plugin-legend">
                <li v-for="segment in pluginSummary.segments" :key="segment.key">
                  <span class="status-dot" :class="segment.tone" aria-hidden="true"></span>
                  <span>{{ segment.label }}</span>
                  <strong>{{ segment.count }}</strong>
                </li>
              </ul>

              <ul class="row-list attention-list">
                <li v-for="plugin in pluginSummary.errors" :key="`error-${plugin.id}`" class="attention-row">
                  <el-icon class="attention-icon error"><WarningFilled /></el-icon>
                  <div class="row-main">
                    <strong>{{ plugin.name }}</strong>
                    <span class="row-sub">{{ plugin.errorMessage || '加载失败' }}</span>
                  </div>
                  <router-link class="md-button text compact" :to="`/plugins/${encodeURIComponent(plugin.id)}/config`">处理</router-link>
                </li>
                <li v-if="pluginSummary.updates.length" class="attention-row">
                  <el-icon class="attention-icon primary"><Top /></el-icon>
                  <div class="row-main">
                    <strong>{{ pluginSummary.updates.length }} 个插件可更新</strong>
                    <span class="row-sub">{{ pluginSummary.updates.map(plugin => `${plugin.name} ${plugin.latestVersion}`).join(' · ') }}</span>
                  </div>
                  <router-link class="md-button text compact" to="/plugins">查看</router-link>
                </li>
                <li v-if="!pluginSummary.errors.length && !pluginSummary.updates.length" class="attention-row calm">
                  <MdIcon name="check_circle" class="attention-icon success" />
                  <div class="row-main"><strong>全部插件运行正常</strong></div>
                </li>
              </ul>
            </template>
            <PanelEmpty v-else :icon="Box" title="暂无插件" detail="可以在插件市场安装，或上传本地插件" />
          </article>
        </section>

        <!-- 运行环境: how and where Shirobot is running. Hidden until the backend reports it. -->
        <section v-if="runtimeFacts.length || memory" class="panel runtime-panel">
          <div class="panel-head">
            <div>
              <h3>运行环境</h3>
              <p>进程与宿主信息</p>
            </div>
          </div>
          <div class="runtime-body">
            <dl class="runtime-facts">
              <div v-for="fact in runtimeFacts" :key="fact.key" class="runtime-fact">
                <dt><MdIcon :name="fact.icon" />{{ fact.label }}</dt>
                <dd :class="{ mono: fact.mono }" :title="fact.value">{{ fact.value }}</dd>
              </div>
            </dl>
            <div v-if="memory" class="memory-card">
              <span class="memory-label"><MdIcon name="memory" />内存占用</span>
              <strong class="memory-value">{{ memory.total }}</strong>
              <template v-if="memory.heap">
                <div class="memory-meter" role="img" :aria-label="`GC 堆 ${memory.heap}，占 ${Math.round(memory.heapRatio * 100)}%`">
                  <span :style="{ width: `${memory.heapRatio * 100}%` }"></span>
                </div>
                <span class="memory-sub">GC 堆 {{ memory.heap }}</span>
              </template>
            </div>
          </div>
        </section>

        <section class="panel today-panel">
          <div class="panel-head">
            <div>
              <h3>消息频率</h3>
              <p>近 24 小时 · 共 {{ messageTotal }} 条<template v-if="peakBar"> · 高峰 {{ peakBar.time }}（{{ peakBar.count }} 条）</template></p>
            </div>
          </div>
          <div v-if="bars.length" class="bars" role="img" aria-label="近 24 小时消息频率柱状图">
            <div v-for="(bar, index) in bars" :key="`${bar.time}-${index}`" class="bar-column" :title="`${bar.time} · ${bar.count} 条`">
              <div class="bar-track">
                <div class="bar" :class="{ peak: bar.peak }" :style="{ height: `${bar.height}%` }"></div>
              </div>
              <span class="bar-time">{{ index % 2 === 0 ? bar.time : '' }}</span>
            </div>
          </div>
          <PanelEmpty v-else :icon="DataLine" title="暂无消息数据" detail="收到消息后会在这里按小时统计" />
        </section>
      </div>

      <aside class="panel log-panel">
        <div class="panel-head">
          <div>
            <h3>运行日志</h3>
            <p>最近 {{ visibleLogs.length }} 条</p>
          </div>
          <router-link class="md-button text" to="/logs">
            查看全部<el-icon><ArrowRight /></el-icon>
          </router-link>
        </div>

        <div class="filter-chips button-group" role="radiogroup" aria-label="日志级别">
          <button
            v-for="filter in logLevelFilters"
            :key="filter.key"
            type="button"
            role="radio"
            class="filter-chip"
            :class="{ selected: levelFilter === filter.key }"
            :aria-checked="levelFilter === filter.key"
            @click="levelFilter = filter.key"
          >
            <el-icon v-if="levelFilter === filter.key"><Check /></el-icon>
            {{ filter.label }}
            <span class="chip-count">{{ logCounts[filter.key] }}</span>
          </button>
        </div>

        <div v-if="latestError" class="latest-error">
          <el-icon class="latest-error-icon"><WarningFilled /></el-icon>
          <div class="latest-error-main">
            <strong>最近报错 · {{ latestError.source || '未知来源' }}</strong>
            <span>{{ latestError.message }}</span>
            <span class="mono">{{ latestError.time }}</span>
          </div>
        </div>

        <PanelEmpty v-if="logsError" :icon="Document" title="暂无日志流推送" :detail="logsError" retry @retry="loadLogs" />
        <ol v-else-if="visibleLogs.length" class="log-list">
          <li v-for="log in visibleLogs" :key="log.id" class="log-row">
            <div class="log-line">
              <span class="status-dot" :class="logTone(log.level)" :title="log.level" aria-hidden="true"></span>
              <span class="log-source">{{ log.source }}</span>
              <span class="mono log-time">{{ log.time }}</span>
            </div>
            <p class="log-message" :title="log.message">{{ log.message }}</p>
          </li>
        </ol>
        <PanelEmpty v-else :icon="Document" :title="levelFilter === 'ALL' ? '暂无日志' : '没有符合条件的日志'" />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  Box,
  Check,
  Connection,
  DataLine,
  Document,
  Top,
  WarningFilled
} from '@element-plus/icons-vue'
import MdIcon from '../../components/MdIcon.vue'
import PanelEmpty from './components/PanelEmpty.vue'
import { adapterStatusLabel, adapterTone, logLevelFilters, logTone, useOverviewPage } from './Overview'

const {
  greeting,
  greetingFace,
  dateLabel,
  heroFacts,
  runtimeFacts,
  memory,
  messageTotal,
  loadAdapters,
  loadPlugins,
  loadLogs,
  health,
  latestError,
  adapters,
  onlineAdapterCount,
  pluginSummary,
  pluginsError,
  visibleLogs,
  logCounts,
  levelFilter,
  bars,
  peakBar,
  loadError,
  adaptersError,
  logsError,
  busyAdapterId,
  powerPending,
  toggleAdapter,
  confirmPower
} = useOverviewPage()
</script>

<style scoped src="./Overview.css"></style>
