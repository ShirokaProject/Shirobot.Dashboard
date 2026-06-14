<template>
  <div class="config-page">
    <el-alert
      v-if="loadError"
      class="page-alert"
      :title="loadError"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="config-layout">
      <aside class="config-nav">
        <button
          v-for="section in sections"
          :key="section.key"
          type="button"
          class="config-nav-item"
          :class="{ active: activeSection === section.key }"
          @click="activeSection = section.key"
        >
          {{ section.label }}
        </button>
      </aside>

      <main class="config-panel">
        <div class="panel-head">
          <h2>{{ currentSection.label }}</h2>
          <p>{{ currentSection.description }}</p>
        </div>

        <el-form label-position="top" class="m3-form">
          <template v-if="activeSection === 'general'">
            <el-form-item label="Bot 名称">
              <el-input v-model="form.name" />
            </el-form-item>
            <div class="setting-row">
              <div>
                <div class="setting-label">调试模式</div>
                <div class="setting-support">开启后会输出更多调试日志。</div>
              </div>
              <el-switch v-model="form.debug" />
            </div>
            <el-form-item label="日志等级">
              <el-select v-model="form.logLevel" placeholder="选择日志等级" style="width: 100%">
                <el-option label="INFO" value="info" />
                <el-option label="DEBUG" value="debug" />
                <el-option label="WARN" value="warn" />
                <el-option label="ERROR" value="error" />
              </el-select>
            </el-form-item>
          </template>

          <template v-else-if="activeSection === 'runtime'">
            <el-form-item label="HTTP 端口">
              <el-input v-model="form.port" />
            </el-form-item>
            <el-form-item label="工作目录">
              <el-input v-model="form.workdir" />
            </el-form-item>
            <div class="setting-row">
              <div>
                <div class="setting-label">自动重载插件</div>
                <div class="setting-support">检测到插件文件变化后自动重载。</div>
              </div>
              <el-switch v-model="form.hotReload" />
            </div>
          </template>

          <template v-else>
            <div class="setting-row">
              <div>
                <div class="setting-label">允许远程管理</div>
                <div class="setting-support">仅建议在受信任网络环境开启。</div>
              </div>
              <el-switch v-model="form.remoteAdmin" />
            </div>
            <el-form-item label="管理员账号">
              <el-input v-model="form.admins" />
            </el-form-item>
          </template>

          <div class="form-actions">
            <el-button round @click="resetConfig">重置</el-button>
            <el-button round type="primary" @click="saveConfig">保存配置</el-button>
          </div>
        </el-form>
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useConfigPage } from './Config'

const { sections, activeSection, currentSection, form, loadError, saveConfig, resetConfig } = useConfigPage()
</script>

<style scoped src="./Config.css"></style>
