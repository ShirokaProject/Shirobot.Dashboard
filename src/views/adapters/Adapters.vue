<template>
  <div class="adapters-page">
    <section class="adapter-intro">
      <div>
        <h2>连接协议</h2>
        <p>管理 Shirobot 与不同平台之间的连接适配器，包含连接状态、账号与事件吞吐。</p>
      </div>
      <el-button round type="primary">新增适配器</el-button>
    </section>

    <el-alert
      v-if="loadError"
      class="page-alert"
      :title="loadError"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="adapter-grid">
      <article v-for="adapter in adapters" :key="adapter.type" class="adapter-card">
        <div class="adapter-head">
          <div class="adapter-icon">{{ adapter.type.slice(0, 1) }}</div>
          <div>
            <h3>{{ adapter.type }}</h3>
            <p>{{ adapter.account }}</p>
          </div>
        </div>
        <div class="adapter-meta">
          <div>
            <span>状态</span>
            <strong :class="adapter.connected ? 'online' : 'offline'">
              {{ adapter.connected ? '已连接' : '断开' }}
            </strong>
          </div>
          <div>
            <span>今日事件</span>
            <strong>{{ adapter.events }}</strong>
          </div>
        </div>
        <div class="adapter-actions">
          <el-button round text>详情</el-button>
          <el-button round :type="adapter.connected ? 'danger' : 'primary'">
            {{ adapter.connected ? '断开' : '连接' }}
          </el-button>
        </div>
      </article>
      <el-empty v-if="!adapters.length" description="暂无适配器数据，后端接入后将在这里显示连接状态。" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAdaptersPage } from './Adapters'

const { adapters, loadError } = useAdaptersPage()
</script>

<style scoped src="./Adapters.css"></style>
