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

    <el-alert
      v-if="saveMessage"
      class="page-alert"
      :title="saveMessage"
      :type="saveMessage.includes('失败') ? 'error' : 'success'"
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
            <el-form-item label="协议适配器">
              <el-select v-model="form.protocol" placeholder="选择协议适配器" style="width: 100%">
                <el-option label="MilkyAdapter" value="MilkyAdapter" />
                <el-option label="OneBotAdapter" value="OneBotAdapter" />
                <el-option label="TelegramAdapter" value="TelegramAdapter" />
              </el-select>
            </el-form-item>

            <div class="setting-row">
              <div>
                <div class="setting-label">启用日志</div>
                <div class="setting-support">对应 enable_log，关闭后将减少运行日志输出。</div>
              </div>
              <el-switch v-model="form.enable_log" />
            </div>

            <div class="setting-row">
              <div>
                <div class="setting-label">禁用控制台输入</div>
                <div class="setting-support">对应 disable_console_input，开启后控制台不再接收交互输入。</div>
              </div>
              <el-switch v-model="form.disable_console_input" />
            </div>

            <el-form-item label="GitHub 代理地址">
              <input v-model="form.github_proxy" class="config-text-input" placeholder="https://gh-proxy.com/" />
            </el-form-item>

            <el-form-item label="主程序更新仓库">
              <input v-model="form.host_update_repository" class="config-text-input" placeholder="ShirokaProject/ShiroBot" />
            </el-form-item>

            <el-form-item label="Avalonia 主题">
              <el-select v-model="form.avalonia_theme" placeholder="选择界面主题" style="width: 100%">
                <el-option label="Light" value="Light" />
                <el-option label="Dark" value="Dark" />
                <el-option label="System" value="System" />
              </el-select>
            </el-form-item>
          </template>

          <template v-else>
            <el-form-item label="所有者 QQ / ID 列表">
              <el-input v-model="form.owner_list" placeholder="例如：1034028486, 100000001" />
            </el-form-item>

            <el-form-item label="管理员 QQ / ID 列表">
              <el-input v-model="form.admin_list" placeholder="多个 ID 可用逗号或空格分隔" />
            </el-form-item>

            <div class="setting-row">
              <div>
                <div class="setting-label">启用 API</div>
                <div class="setting-support">对应 api.enable，开启后 Dashboard 可通过接口管理配置。</div>
              </div>
              <el-switch v-model="form.api_enable" />
            </div>

            <el-form-item label="API 监听地址">
              <el-input v-model="form.api_listen_url" placeholder="http://localhost:8080" />
            </el-form-item>

            <el-form-item label="API 多监听地址">
              <el-input
                v-model="form.api_listen_urls"
                type="textarea"
                :rows="3"
                placeholder="每行一个地址，例如：http://127.0.0.1:7001"
              />
            </el-form-item>

            <el-form-item label="公开基础 URL">
              <el-input v-model="form.api_public_base_url" placeholder="留空表示 null" />
            </el-form-item>

            <div class="setting-row">
              <div>
                <div class="setting-label">启用 API 认证</div>
                <div class="setting-support">对应 api.auth_enable，开启后访问接口需要令牌。</div>
              </div>
              <el-switch v-model="form.api_auth_enable" />
            </div>

            <el-form-item label="API Token">
              <el-input v-model="form.api_token" placeholder="请输入访问令牌" show-password />
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

const { sections, activeSection, currentSection, form, loadError, saveMessage, saveConfig, resetConfig } = useConfigPage()
</script>

<style scoped src="./Config.css"></style>
