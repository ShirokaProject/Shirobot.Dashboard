<template>
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
          <span v-else class="mono">{{ repository || '—' }}</span>
        </dd>
      </div>

</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GitHubIcon from '../../../components/GitHubIcon.vue'
import MdIcon from '../../../components/MdIcon.vue'
import SiteIcon from '../../../components/SiteIcon.vue'
import { githubRepoOf, otherRepoOf, repoPathParts } from '../../../features/plugins/catalogSources'

const props = defineProps<{ repository: string }>()

const githubRepo = computed(() => githubRepoOf(props.repository))
const otherRepo = computed(() => githubRepo.value ? null : otherRepoOf(props.repository))
const avatarFailed = ref(false)
watch(githubRepo, () => { avatarFailed.value = false })
</script>

<style scoped src="./detail.css"></style>

<style src="./factRows.css"></style>
