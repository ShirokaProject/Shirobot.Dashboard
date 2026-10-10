<template>
  <div v-if="entry?.downloadCount != null"><dt><MdIcon name="download" />下载</dt><dd>{{ entry.downloadCount.toLocaleString() }} 次</dd></div>
  <div v-if="publishedAt"><dt><MdIcon name="calendar_today" />发布</dt><dd>{{ publishedAt }}</dd></div>
  <div v-if="entry?.license"><dt><MdIcon name="balance" />许可证</dt><dd>{{ entry.license }}</dd></div>
  <div v-if="entry?.compatibility"><dt><MdIcon name="extension" />声明兼容</dt><dd class="mono">{{ entry.compatibility }}</dd></div>
  <RepositoryFact v-if="repository || entry?.repository" :repository="repository || entry?.repository || ''" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AdapterMarketEntry } from '../../../api'
import MdIcon from '../../../components/MdIcon.vue'
import RepositoryFact from '../../plugins/components/RepositoryFact.vue'
import { formatAdapterDate } from '../../../features/adapters/market'
const props = defineProps<{ entry?: AdapterMarketEntry | null; repository?: string }>()
const publishedAt = computed(() => formatAdapterDate(props.entry?.publishedAt))
</script>

<style scoped src="../../plugins/components/detail.css"></style>

<style src="../../plugins/components/factRows.css"></style>
