<template>
  <dl class="facts">
    <div v-if="version"><dt>版本</dt><dd class="mono">v{{ version }}</dd></div>
    <div v-if="status"><dt>状态</dt><dd>{{ status }}</dd></div>
    <div v-if="permissions?.length"><dt>权限</dt><dd>{{ permissions.join(' · ') }}</dd></div>
    <template v-if="plugin">
      <!-- Rows without a value are omitted rather than shown as dashes -->
      <div v-if="plugin.release.downloadCount !== null"><dt><MdIcon name="download" />下载</dt><dd>{{ plugin.release.downloadCount.toLocaleString() }} 次</dd></div>
      <div v-if="plugin.release.publishedAt"><dt><MdIcon name="calendar_today" />发布</dt><dd>{{ publishedAt }}</dd></div>
      <div v-if="plugin.license"><dt><MdIcon name="balance" />许可证</dt><dd>{{ plugin.license }}</dd></div>
      <div v-if="compatibility !== '—'"><dt><MdIcon name="extension" />声明兼容</dt><dd class="mono" title="插件目录声明的兼容范围；实际加载检查 DLL 的最低 API 要求和共享程序集 ABI，不按此范围禁止 1.0 以上宿主。">{{ compatibility }}</dd></div>
      <div>
        <dt>
          <GitHubIcon v-if="githubRepo" />
          <MdIcon v-else :name="otherRepo ? 'link' : 'code'" />仓库
        </dt>
        <dd>
          <a
            v-if="githubRepo"
            class="repo-link"
            :href="`https://github.com/${githubRepo}`"
            target="_blank"
            rel="noopener noreferrer"
            :title="`在 GitHub 上打开 ${githubRepo}`"
          >
            <img
              v-if="!avatarFailed"
              class="repo-avatar"
              :src="`https://github.com/${githubRepo.split('/')[0]}.png?size=40`"
              alt=""
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="avatarFailed = true"
            />
            <span class="repo-text"><span class="repo-owner"><template v-for="piece in repoPathParts(githubRepo).owner" :key="piece">{{ piece }}<wbr /></template></span><template v-for="piece in repoPathParts(githubRepo).name" :key="piece">{{ piece }}<wbr /></template></span>
            <MdIcon name="open_in_new" class="external" />
          </a>
          <a
            v-else-if="otherRepo"
            class="repo-link"
            :href="otherRepo.href"
            target="_blank"
            rel="noopener noreferrer"
          ><SiteIcon :domain="otherRepo.domain" class="repo-avatar" /><span class="repo-text" :title="otherRepo.label"><span class="repo-owner"><template v-for="piece in repoPathParts(otherRepo.label).owner" :key="piece">{{ piece }}<wbr /></template></span><template v-for="piece in repoPathParts(otherRepo.label).name" :key="piece">{{ piece }}<wbr /></template></span><MdIcon name="open_in_new" class="external" /></a>
          <span v-else class="mono">{{ plugin.repository || '—' }}</span>
        </dd>
      </div>
    </template>
  </dl>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GitHubIcon from '../../../components/GitHubIcon.vue'
import MdIcon from '../../../components/MdIcon.vue'
import SiteIcon from '../../../components/SiteIcon.vue'
import type { MarketplacePlugin } from '../../../api'
import { githubRepoOf, otherRepoOf, repoPathParts } from '../../../features/plugins/catalogSources'

const props = defineProps<{
  plugin: MarketplacePlugin | null
  publishedAt: string
  compatibility: string
  version?: string
  status?: string
  permissions?: string[]
}>()

const githubRepo = computed(() => githubRepoOf(props.plugin?.repository ?? ''))
const otherRepo = computed(() => githubRepo.value ? null : otherRepoOf(props.plugin?.repository ?? ''))
const avatarFailed = ref(false)
watch(githubRepo, () => { avatarFailed.value = false })
</script>

<style scoped src="./detail.css"></style>
