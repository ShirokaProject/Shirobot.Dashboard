<template>
  <main class="login-page">
    <div class="login-theme-controls" aria-label="外观设置">
      <ThemeControls />
    </div>

    <article class="login-card" aria-label="登录 Shirobot Dashboard">
      <!-- Left: saved backends and their sign-in state -->
      <aside class="backend-pane">
        <header class="login-brand">
          <img class="brand-avatar" :src="avatarUrl" alt="" />
          <div>
            <strong>Shirobot</strong>
            <small>Dashboard</small>
          </div>
        </header>

        <span class="pane-label">后端</span>
        <ul class="backend-list" role="radiogroup" aria-label="后端">
          <li v-for="backend in backends" :key="backend.id" class="backend-item">
            <button
              type="button"
              role="radio"
              class="backend-row"
              :class="{ selected: !adding && selectedId === backend.id }"
              :aria-checked="!adding && selectedId === backend.id"
              @click="selectBackend(backend.id)"
            >
              <span class="backend-text">
                <strong>{{ backend.name }}</strong>
                <small class="mono">{{ describeBaseUrl(backend.baseUrl) }}</small>
                <span class="backend-state">
                  <span class="status-dot" :class="backendState(backend).tone" aria-hidden="true"></span>
                  {{ backendState(backend).label }}
                </span>
              </span>
            </button>
            <button
              v-if="backends.length > 1"
              type="button"
              class="icon-button"
              :aria-label="`移除 ${backend.name}`"
              title="移除"
              @click="forgetBackend(backend.id)"
            >
              <el-icon><Close /></el-icon>
            </button>
          </li>
        </ul>

        <button type="button" class="add-button" :class="{ selected: adding }" @click="startAdding">
          <el-icon><Plus /></el-icon>添加后端
        </button>
      </aside>

      <!-- Right: sign in to the selected backend, or add a new one -->
      <section class="form-pane">
        <header class="form-header">
          <h1>{{ adding ? '添加后端' : `登录到 ${selectedName}` }}</h1>
          <p>{{ adding ? '填写另一台 Shirobot 的地址' : selectedAddress }}</p>
        </header>

        <form class="login-form" @submit.prevent="submitLogin">
          <template v-if="adding">
            <label class="text-field">
              <span>地址</span>
              <input
                v-model="draft.baseUrl"
                type="text"
                inputmode="url"
                placeholder="http://10.0.0.5:8080，留空为同源"
                autocomplete="url"
                :disabled="verifying"
              />
            </label>
            <label class="text-field">
              <span>名称 <small>可选</small></span>
              <input v-model="draft.name" type="text" placeholder="例如：家里的服务器" :disabled="verifying" />
            </label>
          </template>

          <label class="text-field" :class="{ invalid: Boolean(errorMessage) }">
            <span>登录密钥</span>
            <input
              v-model="form.token"
              type="password"
              autocomplete="current-password"
              placeholder="后端未启用鉴权时可留空"
              :disabled="verifying"
              @input="errorMessage = ''"
            />
          </label>

          <label class="checkbox">
            <input v-model="form.remember" type="checkbox" :disabled="verifying" />
            <span>记住密钥</span>
            <small>保存在此设备上，切换后端时免输入</small>
          </label>

          <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>

          <button type="submit" class="filled-button" :disabled="verifying">
            {{ verifying ? '验证中…' : '进入' }}
          </button>
        </form>

        <footer v-if="switching || demoEntryVisible" class="login-footer">
          <button v-if="switching" type="button" class="text-button" @click="cancelSwitch">返回</button>
          <button v-if="demoEntryVisible" type="button" class="text-button" @click="enterDemoMode">进入演示模式</button>
        </footer>
      </section>
    </article>
  </main>
</template>

<script setup lang="ts">
import { Close, Plus } from '@element-plus/icons-vue'
import avatarUrl from '../../assets/images/avatar.png'
import ThemeControls from '../../layout/components/ThemeControls.vue'
import { useLoginPage } from './Login'

const {
  backends,
  selectedId,
  selectedName,
  selectedAddress,
  adding,
  draft,
  form,
  verifying,
  errorMessage,
  demoEntryVisible,
  switching,
  describeBaseUrl,
  backendState,
  selectBackend,
  startAdding,
  forgetBackend,
  submitLogin,
  enterDemoMode,
  cancelSwitch
} = useLoginPage()
</script>

<style scoped src="./Login.css"></style>
