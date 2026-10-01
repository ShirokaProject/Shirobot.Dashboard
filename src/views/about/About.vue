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
        <h3>环境</h3>
        <dl class="facts">
          <div v-for="fact in versionFacts" :key="fact.label">
            <dt>{{ fact.label }}</dt>
            <dd>{{ fact.value }}</dd>
          </div>
        </dl>
        <div class="host-update" aria-live="polite">
          <div class="button-group">
            <button type="button" class="md-button tonal" :disabled="checkingUpdate || applyingUpdate || restarting" @click="checkUpdate">
              <MdIcon name="refresh" />{{ checkingUpdate ? '检查中…' : '检查宿主更新' }}
            </button>
            <button v-if="updateCheck?.update_available && updateCheck.can_apply" type="button" class="md-button filled" :disabled="applyingUpdate || restarting" @click="updateAndRestart">
              <MdIcon name="download" />{{ restarting ? '正在重启…' : applyingUpdate ? '更新中…' : '更新并重启' }}
            </button>
          </div>
          <p v-if="restarting">新版本已安装，宿主正在重启。稍后刷新页面即可重新连接。</p>
          <template v-else-if="updateCheck">
            <p v-if="updateCheck.update_available">发现新版本：{{ updateCheck.current_version }} → {{ updateCheck.latest_version }}</p>
            <p v-else-if="!updateCheck.reason">主程序已是最新版本（{{ updateCheck.current_version }}）。</p>
            <p v-if="updateCheck.reason">{{ updateCheck.reason }}</p>
            <a v-if="updateCheck.release_url" :href="updateCheck.release_url" target="_blank" rel="noreferrer">查看版本发布说明</a>
          </template>
          <p v-if="updateError" class="update-error" role="alert">{{ updateError }}</p>
        </div>
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

const { dashboardVersion, versionFacts, copyDiagnostics, updateCheck, checkingUpdate, applyingUpdate, restarting, updateError, checkUpdate, updateAndRestart } = useAboutPage()
</script>

<style scoped src="./About.css"></style>
