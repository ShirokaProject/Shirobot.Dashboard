<template>
  <div class="about-page">
    <section class="about-hero-card">
      <img class="about-avatar" :src="avatarUrl" alt="Shirobot" />
      <div class="about-hero-main">
        <div class="eyebrow">关于 Shirobot Dashboard</div>
        <h2>Shirobot Dashboard</h2>
      </div>
    </section>

    <section class="about-grid">
      <article class="about-card project-card">
        <div class="card-head">
          <span class="card-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M12 2C6.48 2 2 6.58 2 12.22c0 4.52 2.87 8.35 6.84 9.71.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.56 2.35 1.11 2.92.85.09-.66.35-1.11.63-1.36-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 5.95c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.09 10.09 0 0 0 22 12.22C22 6.58 17.52 2 12 2z" />
            </svg>
          </span>
          <div>
            <h3>项目地址</h3>
            <p>ShirokaProject 相关项目与源码入口。</p>
          </div>
        </div>
        <a class="link-panel" href="https://github.com/ShirokaProject" target="_blank" rel="noreferrer">
          https://github.com/ShirokaProject
        </a>
      </article>

      <article class="about-card">
        <div class="card-head">
          <span class="card-icon" aria-hidden="true">✦</span>
          <div>
            <h3>鸣谢</h3>
            <p>感谢这些项目和资源让面板开发更高效。</p>
          </div>
        </div>
        <div class="chip-list">
          <span>Vue 3</span>
          <span>Vite</span>
          <span>TypeScript</span>
          <span>Element Plus</span>
          <span>Material Design 3</span>
          <span>Maple Mono</span>
        </div>
      </article>

      <article class="about-card sponsor-card">
        <div class="card-head">
          <span class="card-icon" aria-hidden="true">♡</span>
          <div>
            <h3>赞助与支持</h3>
            <p>如果这个项目对你有帮助，欢迎通过 GitHub 支持项目。</p>
          </div>
        </div>
        <div class="sponsor-panel">
          <strong>感谢每一位使用者、反馈者和贡献者。</strong>
          <p>赞助入口可后续接入 GitHub Sponsors、爱发电或其他平台。</p>
        </div>
      </article>

      <article class="about-card version-card">
        <div class="card-head">
          <span class="card-icon" aria-hidden="true">i</span>
          <div>
            <h3>版本信息</h3>
            <p>当前 Dashboard 前端版本。</p>
          </div>
        </div>
        <div class="info-list compact">
          <div>
            <span>Dashboard</span>
            <strong>v0.1.0</strong>
          </div>
          <div>
            <span>技术栈</span>
            <strong>Vue 3 + Vite + TypeScript</strong>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import avatarUrl from '../../assets/images/avatar.png'
import { useAboutPage } from './About'

useAboutPage()
</script>

<style scoped src="./About.css"></style>
