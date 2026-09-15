<template>
  <div class="components-page">
    <section class="components-hero">
      <div>
        <span class="hero-kicker">Runtime components</span>
        <h2>运行组件</h2>
        <p>查看宿主内置平台契约，并管理当前 Adapter 的加载状态。</p>
      </div>
      <el-button round :loading="loading" :disabled="busy" @click="loadComponents">刷新状态</el-button>
    </section>

    <el-alert
      v-if="loadError"
      class="page-alert"
      :title="loadError"
      type="warning"
      show-icon
      :closable="false"
    />
    <el-alert
      v-if="actionMessage"
      class="page-alert"
      :title="actionMessage"
      :type="actionMessageType"
      show-icon
      closable
      @close="actionMessage = ''"
    />

    <section class="component-layout">
      <article class="adapter-panel">
        <div class="section-heading">
          <div>
            <span class="section-label">Adapter</span>
            <h3>{{ adapterDisplayName }}</h3>
          </div>
          <span class="status-pill" :class="adapter.loaded ? 'is-online' : 'is-offline'">
            {{ adapter.loaded ? '运行中' : '未加载' }}
          </span>
        </div>

        <div class="adapter-identity">
          <div class="adapter-mark">{{ (adapter.platform || adapter.name || 'A').slice(0, 1).toUpperCase() }}</div>
          <div class="identity-copy">
            <strong>{{ adapter.platform || '无平台连接' }}</strong>
            <span>{{ adapter.id || '可输入 DLL 路径加载 Adapter' }}</span>
          </div>
          <span class="version-chip">{{ adapter.version || '—' }}</span>
        </div>

        <label class="field-label" for="adapter-path">Adapter DLL 路径</label>
        <el-input
          id="adapter-path"
          v-model="adapterPath"
          :disabled="busy"
          placeholder="/path/to/ShiroBot.Adapter.Milky.dll"
          clearable
        />
        <p class="field-hint">留空时重载当前 Adapter；未加载 Adapter 时必须提供绝对路径。</p>

        <div class="action-row">
          <el-button
            round
            type="primary"
            :loading="adapterOperation === 'reload'"
            :disabled="busy"
            @click="handleReloadAdapter"
          >
            {{ adapter.loaded ? '热重载 Adapter' : '加载 Adapter' }}
          </el-button>
          <el-button
            round
            type="danger"
            plain
            :loading="adapterOperation === 'stop'"
            :disabled="busy || !adapter.loaded"
            @click="handleStopAdapter"
          >
            停止并卸载
          </el-button>
        </div>
      </article>

      <article class="model-panel">
        <div class="section-heading">
          <div>
            <span class="section-label">Platform models</span>
            <h3>内置 Models</h3>
          </div>
          <span class="model-count">{{ models.length }}</span>
        </div>

        <div v-if="models.length" class="model-list">
          <div v-for="model in models" :key="model.id" class="model-item">
            <div class="model-icon">M</div>
            <div class="model-copy">
              <strong>{{ model.assembly }}</strong>
              <span>{{ model.id }}</span>
              <small>{{ model.source === 'built_in' ? '随宿主内置，不支持运行时替换' : model.source }}</small>
            </div>
            <span class="version-chip">{{ model.version }}</span>
          </div>
        </div>
        <el-empty v-else description="宿主未包含平台 Model" />
      </article>
    </section>

    <section class="reload-notes">
      <div class="note-number">01</div>
      <div><strong>Models 内置</strong><span>Discord、QQ 与 Telegram 契约随宿主发布，不支持运行时替换。</span></div>
      <div class="note-number">02</div>
      <div><strong>真实程序集卸载</strong><span>只有 collectible ALC 确认释放后，DLL 才会被替换或重新加载。</span></div>
      <div class="note-number">03</div>
      <div><strong>第三方扩展</strong><span>新的业务与平台能力应实现为标准 Plugin，并通过 Plugins 页面管理。</span></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAdaptersPage } from './Adapters'

const {
  adapter,
  models,
  adapterPath,
  loading,
  adapterOperation,
  busy,
  loadError,
  actionMessage,
  actionMessageType,
  adapterDisplayName,
  loadComponents,
  handleReloadAdapter,
  handleStopAdapter
} = useAdaptersPage()
</script>

<style scoped src="./Adapters.css"></style>
