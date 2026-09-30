<template>
  <div class="about-page">
    <!-- One connected group: hero, then versions | links, then credits -->
    <section class="hero panel">
      <img class="hero-avatar" :src="avatarUrl" alt="" />
      <div class="hero-text">
        <h2>Shirobot Dashboard</h2>
        <p>Shirobot 的网页管理面板<span class="sep">·</span>v{{ dashboardVersion }}</p>
      </div>
      <div class="button-group">
        <a class="md-button tonal" :href="DOCS_URL" target="_blank" rel="noreferrer"><MdIcon name="link" />文档</a>
        <a class="md-button filled" :href="ORG_URL" target="_blank" rel="noreferrer"><GitHubIcon />GitHub</a>
      </div>
    </section>

    <div class="middle">
      <section class="panel versions">
        <h3>版本</h3>
        <dl class="facts">
          <div v-for="fact in versionFacts" :key="fact.label">
            <dt>{{ fact.label }}<small v-if="fact.note">{{ fact.note }}</small></dt>
            <dd>{{ fact.value }}</dd>
          </div>
        </dl>
        <p class="footnote">Dashboard 与 Shirobot 主程序独立发版，版本号互不关联。</p>
      </section>

      <section class="panel links">
        <h3>链接</h3>
        <a v-for="link in links" :key="link.href" class="link-row" :href="link.href" target="_blank" rel="noreferrer">
          <span class="link-icon" aria-hidden="true">
            <GitHubIcon v-if="link.icon === 'github'" />
            <MdIcon v-else :name="link.icon" />
          </span>
          <span class="link-text">
            <strong>{{ link.label }}</strong>
            <small>{{ link.detail }}</small>
          </span>
          <MdIcon name="open_in_new" class="link-external" />
        </a>
        <div class="diagnostics">
          <p>提交问题时，附上版本和运行环境能更快定位。</p>
          <button type="button" class="md-button tonal" @click="copyDiagnostics">
            <MdIcon name="content_copy" />复制诊断信息
          </button>
        </div>
      </section>
    </div>

    <section class="panel credits">
      <h3>鸣谢</h3>
      <p>感谢每一位使用者、反馈者和贡献者。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import avatarUrl from '../../assets/images/avatar.png'
import GitHubIcon from '../../components/GitHubIcon.vue'
import MdIcon from '../../components/MdIcon.vue'
import { DOCS_URL } from '../../features/docs'
import { links, ORG_URL, useAboutPage } from './About'

const { dashboardVersion, versionFacts, copyDiagnostics } = useAboutPage()
</script>

<style scoped src="./About.css"></style>
