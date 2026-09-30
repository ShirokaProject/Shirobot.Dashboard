<template>
  <article v-if="adapter" class="detail">
    <header class="detail-head">
      <span class="avatar" aria-hidden="true">{{ adapter.platform.slice(0, 2).toUpperCase() }}</span>
      <div class="detail-title">
        <h2>{{ adapter.name }}</h2>
        <p>{{ adapter.platform }}<span class="sep">·</span>{{ adapter.loaded ? '运行中' : '已停止' }}</p>
      </div>
      <el-switch
        :model-value="adapter.loaded"
        :disabled="busy"
        :aria-label="adapter.loaded ? '停止 Adapter' : '启动 Adapter'"
        @change="(value: string | number | boolean) => emit('run', value ? 'start' : 'stop')"
      />
    </header>

    <p v-if="adapter.description" class="detail-desc">{{ adapter.description }}</p>

    <!-- At most the things that need attention, most severe first -->
    <div v-if="adapter.error" class="notice">
      <MdIcon name="error" class="notice-icon error" />
      <div><strong>运行出错</strong><span>{{ adapter.error }}</span></div>
    </div>
    <div v-if="update" class="notice">
      <MdIcon name="arrow_upward" class="notice-icon accent" />
      <div><strong>可更新到 v{{ update.version }}</strong><span>当前 v{{ adapter.version }}</span></div>
      <button type="button" class="md-button compact filled" :disabled="busy" @click="emit('update')">更新</button>
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
      <div><dt><MdIcon name="sell" />版本</dt><dd class="mono">v{{ adapter.version }}</dd></div>
      <div><dt><MdIcon name="code" />ID</dt><dd class="mono">{{ adapter.id }}</dd></div>
      <div v-if="adapter.assemblyPath">
        <dt><MdIcon name="folder" />程序集</dt>
        <dd class="mono path" :title="adapter.assemblyPath">{{ fileName(adapter.assemblyPath) }}</dd>
      </div>
    </dl>

    <footer class="detail-foot button-group">
      <button type="button" class="md-button tonal" :disabled="busy" @click="emit('config')">
        <MdIcon name="settings" />配置
      </button>
      <button type="button" class="md-button tonal" :disabled="busy" @click="emit('run', 'reload')">
        <MdIcon name="refresh" />{{ operation === 'reload' ? '重载中…' : '重载' }}
      </button>
      <button type="button" class="md-button tonal danger" :disabled="busy" @click="emit('run', 'delete')">
        <MdIcon name="delete" />{{ operation === 'delete' ? '删除中…' : '删除' }}
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import MdIcon from '../../../components/MdIcon.vue'
import type { AdapterMarketEntry, AdapterStatus } from '../../../api'

defineProps<{
  adapter: AdapterStatus | null
  /** Catalog entry offering a newer version, when there is one */
  update: AdapterMarketEntry | null
  busy: boolean
  /** The action currently running on this adapter, if any */
  operation: string
}>()

const emit = defineEmits<{
  run: [action: 'start' | 'stop' | 'reload' | 'delete']
  update: []
  config: []
}>()

// The full path is long and machine-specific; show the file name, keep the path in the tooltip.
function fileName(path: string) {
  return path.split(/[\\/]/).pop() || path
}
</script>

<style scoped src="../../plugins/components/detail.css"></style>
<style scoped>
/* Two-letter platform initials need a smaller size than the plugins' single letter */
.avatar {
  font: var(--md-sys-typescale-title-medium);
  font-weight: 700;
}

.facts dd.path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
