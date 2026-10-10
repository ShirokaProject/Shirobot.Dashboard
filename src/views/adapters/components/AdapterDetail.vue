<template>
  <article v-if="adapter" class="detail">
    <header class="detail-head">
      <div class="detail-title">
        <h2>{{ adapter.name }}</h2>
        <p>{{ packageName }}<span class="sep">·</span>{{ adapter.loaded ? '运行中' : '已停止' }}</p>
      </div>
      <el-switch
        :model-value="adapter.loaded"
        :disabled="busy || !packageEnabled"
        :aria-label="adapter.loaded ? '停止实例' : '启动实例'"
        @change="(value: string | number | boolean) => emit('run', value ? 'start' : 'stop')"
      />
    </header>

    <!-- At most the things that need attention, most severe first -->
    <div v-if="!packageEnabled" class="notice">
      <MdIcon name="power_settings_new" class="notice-icon warning" />
      <div><strong>适配器已关闭</strong><span>打开适配器后，此实例才能启动。</span></div>
    </div>
    <div v-if="adapter.error" class="notice">
      <MdIcon name="error" class="notice-icon error" />
      <div><strong>运行出错</strong><span>{{ adapter.error }}</span></div>
    </div>
    <div v-if="adapter.restartRequired" class="notice">
      <MdIcon name="restart_alt" class="notice-icon warning" />
      <div><strong>需要重启宿主</strong><span>有待完成的更改，重启 Shirobot 后完全生效。</span></div>
    </div>
    <div v-if="adapter.rollback" class="notice">
      <MdIcon name="error" class="notice-icon warning" />
      <div><strong>最近一次操作已回滚</strong><span>{{ adapter.rollback }}</span></div>
    </div>

    <dl class="facts">
      <div><dt><MdIcon name="deployed_code" />名称</dt><dd>{{ adapter.name }}</dd></div>
      <div><dt><MdIcon name="code" />实例 ID</dt><dd class="mono">{{ adapter.id }}</dd></div>
      <div><dt><MdIcon name="extension" />适配器</dt><dd>{{ packageName }}</dd></div>
      <div v-if="adapter.configPath">
        <dt><MdIcon name="settings" />配置</dt>
        <dd class="mono path" :title="adapter.configPath">{{ fileName(adapter.configPath) }}</dd>
      </div>
      <AdapterMarketFacts :entry="marketEntry" :repository="adapter.repository" />
    </dl>

    <footer class="detail-foot button-group">
      <button type="button" class="md-button tonal" :disabled="busy" @click="emit('config')">
        <MdIcon name="settings" />配置
      </button>
      <button type="button" class="md-button tonal danger" :disabled="busy" @click="emit('run', 'delete')">
        <MdIcon name="delete" />{{ operation === 'delete' ? '删除中…' : '删除' }}
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import AdapterMarketFacts from './AdapterMarketFacts.vue'
import MdIcon from '../../../components/MdIcon.vue'
import type { AdapterMarketEntry, AdapterStatus } from '../../../api'

defineProps<{
  marketEntry?: AdapterMarketEntry | null
  adapter: AdapterStatus | null
  /** Display name of the adapter package this instance belongs to */
  packageName: string
  busy: boolean
  /** The package master switch; off keeps this instance from starting */
  packageEnabled: boolean
  /** The action currently running on this adapter, if any */
  operation: string
}>()

const emit = defineEmits<{
  run: [action: 'start' | 'stop' | 'reload' | 'delete']
  config: []
}>()

// The full path is long and machine-specific; show the file name, keep the path in the tooltip.
function fileName(path: string) {
  return path.split(/[\\/]/).pop() || path
}
</script>

<style scoped src="../../plugins/components/detail.css"></style>
<style scoped>
.facts dd.path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
