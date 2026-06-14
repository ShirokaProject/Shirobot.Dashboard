<template>
  <div class="plugin-config-page">
    <el-alert
      v-if="loadError"
      class="page-alert"
      :title="loadError"
      type="warning"
      show-icon
      :closable="false"
    />

    <section class="config-header-card">
      <div class="plugin-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M20.5 11H19V7.5C19 6.67 18.33 6 17.5 6H14V4.5C14 3.12 12.88 2 11.5 2S9 3.12 9 4.5V6H5.5C4.67 6 4 6.67 4 7.5V11h1.5C6.88 11 8 12.12 8 13.5S6.88 16 5.5 16H4v3.5c0 .83.67 1.5 1.5 1.5H9v-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V21h3.5c.83 0 1.5-.67 1.5-1.5V16h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11Z" />
        </svg>
      </div>
      <div class="header-main">
        <div class="eyebrow">插件配置</div>
        <h2>{{ pluginName }}</h2>
        <p>配置插件运行参数、权限与触发规则。当前页面为配置雏形，后续可直接接入后端配置 schema。</p>
      </div>
      <div class="header-actions">
        <el-button round @click="$router.push('/plugins')">返回插件</el-button>
        <el-button round type="primary" @click="savePluginConfig">保存配置</el-button>
      </div>
    </section>

    <section class="config-layout">
      <aside class="config-sections">
        <button
          v-for="section in sections"
          :key="section.key"
          type="button"
          class="section-item"
          :class="{ active: activeSection === section.key }"
          @click="activeSection = section.key"
        >
          <span class="section-icon" aria-hidden="true">
            <component :is="section.icon" />
          </span>
          <span>
            <strong>{{ section.label }}</strong>
            <small>{{ section.description }}</small>
          </span>
        </button>
      </aside>

      <main class="config-editor">
        <template v-if="activeSection === 'basic'">
          <div class="form-card">
            <div class="form-card-head">
              <h3>基础配置</h3>
              <p>控制插件的基础行为与运行开关。</p>
            </div>
            <el-form label-position="top" class="m3-form">
              <el-form-item label="插件别名">
                <el-input v-model="form.alias" placeholder="例如：Echo Debugger" />
              </el-form-item>
              <el-form-item label="日志等级">
                <el-select v-model="form.logLevel" style="width: 100%">
                  <el-option label="INFO" value="info" />
                  <el-option label="DEBUG" value="debug" />
                  <el-option label="WARN" value="warn" />
                  <el-option label="ERROR" value="error" />
                </el-select>
              </el-form-item>
              <div class="switch-row">
                <div>
                  <strong>启用调试输出</strong>
                  <p>开启后插件会输出更详细的运行日志。</p>
                </div>
                <el-switch v-model="form.debug" />
              </div>
              <div class="switch-row">
                <div>
                  <strong>启动时自动加载</strong>
                  <p>机器人启动后自动加载该插件。</p>
                </div>
                <el-switch v-model="form.autoLoad" />
              </div>
            </el-form>
          </div>
        </template>

        <template v-else-if="activeSection === 'permissions'">
          <div class="form-card">
            <div class="form-card-head">
              <h3>权限配置</h3>
              <p>限制插件可访问的资源与可执行操作。</p>
            </div>
            <div class="permission-grid">
              <el-empty v-if="!permissions.length" description="暂无权限配置数据，后端接入后将在这里显示权限项。" />
              <label v-for="item in permissions" :key="item.key" class="permission-card">
                <div>
                  <strong>{{ item.label }}</strong>
                  <p>{{ item.description }}</p>
                </div>
                <el-switch v-model="item.enabled" />
              </label>
            </div>
          </div>
        </template>

        <template v-else-if="activeSection === 'triggers'">
          <div class="form-card">
            <div class="form-card-head">
              <h3>触发规则</h3>
              <p>配置插件响应的命令、事件和作用范围。</p>
            </div>
            <el-form label-position="top" class="m3-form">
              <el-form-item label="命令前缀">
                <el-input v-model="form.commandPrefix" placeholder="例如：/echo" />
              </el-form-item>
              <el-form-item label="生效范围">
                <el-select v-model="form.scope" style="width: 100%">
                  <el-option label="全部会话" value="all" />
                  <el-option label="仅群聊" value="group" />
                  <el-option label="仅私聊" value="private" />
                </el-select>
              </el-form-item>
              <div class="switch-row">
                <div>
                  <strong>响应群消息</strong>
                  <p>允许插件监听群聊消息事件。</p>
                </div>
                <el-switch v-model="form.groupMessage" />
              </div>
              <div class="switch-row">
                <div>
                  <strong>响应私聊消息</strong>
                  <p>允许插件监听私聊消息事件。</p>
                </div>
                <el-switch v-model="form.privateMessage" />
              </div>
            </el-form>
          </div>
        </template>

        <template v-else>
          <div class="form-card">
            <div class="form-card-head">
              <h3>高级配置</h3>
              <p>高级配置会影响插件运行稳定性，修改前请确认风险。</p>
            </div>
            <el-form label-position="top" class="m3-form">
              <el-form-item label="执行超时（毫秒）">
                <el-input v-model="form.timeout" />
              </el-form-item>
              <el-form-item label="最大并发任务数">
                <el-input v-model="form.concurrency" />
              </el-form-item>
              <el-form-item label="自定义配置 JSON">
                <el-input v-model="form.rawConfig" type="textarea" :rows="8" />
              </el-form-item>
            </el-form>
          </div>
        </template>
      </main>

      <aside class="config-inspector">
        <section class="inspector-card">
          <h3>配置摘要</h3>
          <div class="kv-list">
            <div>
              <span>插件</span>
              <strong>{{ pluginName }}</strong>
            </div>
            <div>
              <span>配置状态</span>
              <strong>未保存</strong>
            </div>
            <div>
              <span>最近保存</span>
              <strong>2026-06-13 19:30</strong>
            </div>
          </div>
        </section>

        <section class="inspector-card warning">
          <h3>注意</h3>
          <p>保存配置后，部分插件可能需要重新加载才能生效。</p>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { usePluginConfigPage } from './PluginConfig'

const { pluginName, sections, activeSection, form, permissions, loadError, savePluginConfig } = usePluginConfigPage()
</script>

<style scoped src="./PluginConfig.css"></style>
