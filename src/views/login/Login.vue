<template>
  <main class="login-page">
    <div class="login-theme-controls" aria-label="外观设置">
      <ThemeControls />
    </div>

    <section class="login-shell" aria-label="登录 Shirobot Dashboard">
      <article class="login-card">
        <header class="brand-lockup">
          <img class="brand-avatar" :src="avatarUrl" alt="Shirobot" />
          <span class="eyebrow">Shirobot</span>
          <h1>Dashboard</h1>
          <p class="brand-subtitle">连接到本地 Shirobot 服务</p>
        </header>

        <form class="login-form" @submit.prevent="submitLogin">
          <label class="md3-text-field" :class="{ invalid: Boolean(errorMessage) }">
            <input
              v-model="form.token"
              type="password"
              placeholder=" "
              autocomplete="current-password"
              :disabled="verifying"
              @input="errorMessage = ''"
            />
            <span class="field-label-text">登录密钥</span>
            <span class="field-outline" aria-hidden="true"></span>
            <small>仅保存在当前浏览器会话</small>
          </label>

          <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>

          <button type="submit" class="md3-button filled" :disabled="verifying">
            {{ verifying ? '验证中…' : '进入' }}
          </button>
        </form>

        <section v-if="demoEntryVisible" class="demo-card">
          <div>
            <strong>演示模式</strong>
            <p>使用内置演示数据，不请求后端。</p>
          </div>
          <button type="button" class="md3-button outlined" @click="enterDemoMode">进入演示</button>
        </section>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import avatarUrl from '../../assets/images/avatar.png'
import ThemeControls from '../../layout/components/ThemeControls.vue'
import { useLoginPage } from './Login'

const {
  form,
  verifying,
  errorMessage,
  demoEntryVisible,
  submitLogin,
  enterDemoMode
} = useLoginPage()
</script>

<style scoped src="./Login.css"></style>
