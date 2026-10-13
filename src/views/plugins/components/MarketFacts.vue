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
      <div v-if="compatibility !== '—'"><dt><MdIcon name="extension" />兼容要求</dt><dd class="mono" title="新版目录从发布 DLL 静态提取 API 和 ABI 要求，不代表运行测试；实际加载仍由宿主检查。">{{ compatibility }}</dd></div>
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
