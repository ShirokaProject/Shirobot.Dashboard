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
    <section class="welcome-panel">
      <div>
        <div class="welcome-kicker">
          <span class="material-icon soft">
            <svg viewBox="0 0 24 24"><path d="M6.76 4.84 4.96 3.05 3.55 4.46l1.79 1.79 1.42-1.41ZM1 13h3v-2H1v2Zm10-12h2v3h-2V1Zm8.04 2.05-1.79 1.79 1.41 1.41 1.79-1.79-1.41-1.41ZM17.24 19.16l1.79 1.8 1.41-1.42-1.79-1.79-1.41 1.41ZM20 11v2h3v-2h-3ZM4.96 20.95l1.8-1.79-1.42-1.41-1.79 1.79 1.41 1.41ZM11 20h2v3h-2v-3Zm1-14a6 6 0 1 0 0 12A6 6 0 0 0 12 6Z" /></svg>
          </span>
          Shirobot Dashboard
        </div>
        <h2>晚上好！</h2>
        <div class="login-summary-card">
          <span>登录状态</span>
          <strong>{{ loginModeLabel }} · {{ loginStatusLabel }}</strong>
          <small>{{ loginEndpointLabel }}</small>
        </div>
      </div>
      <div class="version-panel">
        <div class="version-item">
          <span><IconPackage /> Shirobot 版本</span>
          <strong>{{ shirobotInfo.version }}</strong>
        </div>
        <div class="version-item">
          <span><IconTimer /> 稳定运行</span>
          <strong>{{ shirobotInfo.uptime }}</strong>
        </div>
      </div>
    </section>

    <section class="latest-error-panel">
      <span class="error-icon" aria-hidden="true"><IconError /></span>
      <div class="error-content">
        <span class="error-label">最近一次报错</span>
        <strong>{{ latestError.source || '暂无错误数据' }}</strong>
        <p>{{ latestError.message || '后端接入后将在这里显示最近一次错误。' }}</p>
      </div>
      <span class="error-time">{{ latestError.time || '—' }}</span>
    </section>

    <section class="metric-grid">
      <el-card v-for="item in stats" :key="item.label" shadow="never" class="metric-card">
        <div class="metric-head">
          <span class="material-icon"><component :is="item.icon" /></span>
          <div class="metric-label">{{ item.label }}</div>
        </div>
        <div class="metric-value">{{ item.value }}</div>
        <div class="metric-support">{{ item.support }}</div>
      </el-card>
    </section>

    <section class="content-grid">
      <el-card shadow="never" class="activity-card">
        <div class="section-head">
          <div>
            <h3>消息频率</h3>
            <p>过去 24 小时消息吞吐概况</p>
          </div>
          <span class="md3-chip">24h</span>
        </div>
        <div class="chart-surface">
          <template v-if="bars.length">
            <div v-for="(bar, index) in bars" :key="`${bar}-${index}`" class="bar" :style="{ height: `${bar}%` }"></div>
          </template>
          <div v-else class="empty-state">暂无消息频率数据</div>
        </div>
      </el-card>

      <el-card shadow="never" class="log-card">
        <div class="section-head compact">
          <div>
            <h3>最近事件</h3>
            <p>系统关键运行日志</p>
          </div>
        </div>
        <div class="event-list">
          <template v-if="events.length">
            <div v-for="event in events" :key="`${event.time}-${event.title}`" class="event-item">
              <span class="event-dot"><IconEvent /></span>
              <div>
                <div class="event-title">{{ event.title }}</div>
                <div class="event-meta">{{ event.time }}</div>
              </div>
            </div>
          </template>
          <div v-else class="empty-state">暂无最近事件</div>
        </div>
      </el-card>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useOverviewPage } from './Overview'

const {
  IconPackage,
  IconTimer,
  IconError,
  IconEvent,
  shirobotInfo,
  latestError,
  stats,
  bars,
  events,
  loadError,
  loginModeLabel,
  loginStatusLabel,
  loginEndpointLabel
} = useOverviewPage()
</script>

<style scoped src="./Overview.css"></style>
