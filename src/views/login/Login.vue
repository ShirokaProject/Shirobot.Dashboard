<template>
  <main class="login-page">
    <div class="login-theme-controls" aria-label="外观设置">
      <ThemeControls />
    </div>

    <section class="login-shell" aria-label="登录 Shirobot Dashboard">
      <article class="login-card">
        <section class="login-hero-pane">
          <div class="brand-lockup">
            <img class="brand-avatar" :src="avatarUrl" alt="Shirobot" />
            <div>
              <span class="eyebrow">Shirobot</span>
              <h1>Dashboard</h1>
            </div>
          </div>

          <div class="hero-orbs" aria-hidden="true">
            <span class="hero-orb orb-one"></span>
            <span class="hero-orb orb-two"></span>
            <span class="hero-orb orb-three"></span>
          </div>
        </section>

        <section class="login-form-pane">
          <header class="form-header">
            <span class="form-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Zm3 4a1.5 1.5 0 0 1 .75 2.8V19h-1.5v-2.2A1.5 1.5 0 0 1 12 14Z" />
              </svg>
            </span>
            <div>
              <h2>登录</h2>
            </div>
          </header>

          <section v-if="profiles.length" class="profile-strip" aria-label="已保存登录配置">
            <button
              v-for="profile in profiles"
              :key="profile.id"
              type="button"
              class="profile-chip"
              :class="{ active: selectedProfileId === profile.id }"
              @click="selectProfile(profile)"
            >
              <span>{{ profile.label }}</span>
              <small>{{ profile.mode === 'demo' ? '演示' : '连接' }}</small>
            </button>
          </section>

          <div class="mode-segmented" role="group" aria-label="连接模式">
            <button
              type="button"
              class="mode-option"
              :class="{ active: mode === 'api' }"
              :aria-pressed="mode === 'api'"
              @click="mode = 'api'"
            >
              连接
            </button>
            <button
              type="button"
              class="mode-option"
              :class="{ active: mode === 'demo' }"
              :aria-pressed="mode === 'demo'"
              @click="mode = 'demo'"
            >
              演示
            </button>
          </div>

          <form class="login-form" @submit.prevent="submitLogin">
            <template v-if="!isDemoMode">
              <button type="button" class="endpoint-toggle" :aria-expanded="showEndpointSettings" @click="toggleEndpointSettings">
                <span>外部后端</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" :class="{ open: showEndpointSettings }">
                  <path d="m7 10 5 5 5-5" />
                </svg>
              </button>

              <label v-if="showEndpointSettings" class="md3-text-field">
                <input v-model="form.apiBaseUrl" type="url" placeholder=" " />
                <span class="field-label-text">API Base URL</span>
                <span class="field-outline" aria-hidden="true"></span>
                <small>留空使用同源接口</small>
              </label>

              <label class="md3-text-field">
                <input v-model="form.token" type="password" placeholder=" " autocomplete="current-password" />
                <span class="field-label-text">Token</span>
                <span class="field-outline" aria-hidden="true"></span>
                <small>仅保存在当前浏览器会话</small>
              </label>
            </template>

            <section v-else class="demo-card">
              <span class="demo-icon" aria-hidden="true">✦</span>
              <div>
                <strong>演示模式</strong>
                <p>使用内置演示数据，不请求后端，适合截图、预览和 UI 审查。</p>
              </div>
            </section>

            <div class="form-actions">
              <button type="submit" class="md3-button filled-tonal">进入</button>
            </div>
          </form>
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
  mode,
  form,
  profiles,
  selectedProfileId,
  isDemoMode,
  showEndpointSettings,
  selectProfile,
  submitLogin,
  toggleEndpointSettings
} = useLoginPage()
</script>

<style scoped src="./Login.css"></style>
