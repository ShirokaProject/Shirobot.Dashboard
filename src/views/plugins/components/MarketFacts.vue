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
      <RepositoryFact :repository="plugin.repository" />
    </template>
  </dl>
</template>

<script setup lang="ts">
import MdIcon from '../../../components/MdIcon.vue'
import RepositoryFact from './RepositoryFact.vue'
import type { MarketplacePlugin } from '../../../api'

defineProps<{
  plugin: MarketplacePlugin | null
  publishedAt: string
  compatibility: string
  version?: string
  status?: string
  permissions?: string[]
}>()
</script>

<style scoped src="./detail.css"></style>
