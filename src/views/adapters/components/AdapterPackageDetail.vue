<template>
  <article class="detail">
    <header class="detail-head">
      <div class="detail-title">
        <h2>{{ pkg.name }}</h2>
        <p>{{ pkg.platform }}<span class="sep">·</span>{{ controls ? (enabled ? '已打开' : '已关闭') : `${instanceCount} 个实例` }}</p>
      </div>
      <el-switch
        v-if="controls"
        :model-value="enabled"
        :disabled="busy"
        :aria-label="enabled ? '关闭适配器' : '打开适配器'"
        @change="(value: string | number | boolean) => emit('run', value ? 'start' : 'stop')"
      />
    </header>

    <p v-if="pkg.description" class="detail-desc">{{ pkg.description }}</p>

    <div v-if="update" class="notice package-update">
      <MdIcon name="arrow_upward" class="notice-icon accent" />
      <div><strong>适配器包可更新到 v{{ update.version }}</strong><span>当前 v{{ pkg.version }}，更新程序集将应用于此包的所有实例，各实例配置保留。</span></div>
      <button type="button" class="md-button compact filled" :disabled="busy" @click="emit('update')">更新程序集</button>
    </div>
    <div v-if="pkg.restartRequired" class="notice">
      <MdIcon name="restart_alt" class="notice-icon warning" />
      <div><strong>需要重启宿主</strong><span>有待完成的更改，重启 Shirobot 后完全生效。</span></div>
    </div>

    <dl class="facts">
      <div><dt><MdIcon name="sell" />版本</dt><dd class="mono">v{{ pkg.version }}</dd></div>
      <div><dt><MdIcon name="extension" />适配器包</dt><dd class="mono">{{ pkg.id }}</dd></div>
      <div><dt><MdIcon name="deployed_code" />实例</dt><dd>{{ instanceCount }} 个</dd></div>
      <div v-if="pkg.assemblyPath">
        <dt><MdIcon name="folder" />程序集</dt>
        <dd class="mono path" :title="pkg.assemblyPath">{{ fileName(pkg.assemblyPath) }}</dd>
      </div>
      <AdapterMarketFacts :entry="marketEntry" :repository="pkg.repository" />
    </dl>

    <p class="footnote">实例和连接配置保存在此适配器的 config.toml 中。</p>

    <footer class="detail-foot button-group">
      <button v-if="controls" type="button" class="md-button tonal" :disabled="busy || !enabled" @click="emit('run', 'reload')">
        <MdIcon name="refresh" />{{ operation === 'package-reload' ? '重载中…' : '重载' }}
      </button>
      <button type="button" class="md-button tonal danger" :disabled="busy" @click="emit('remove')">
        <MdIcon name="delete" />{{ operation === 'delete-package' ? '删除中…' : '删除适配器包' }}
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
  pkg: AdapterStatus
  instanceCount: number
  /** Catalog entry offering a newer version, when there is one */
  update: AdapterMarketEntry | null
  busy: boolean
  /** Package master switch state */
  enabled: boolean
  /** Whether the host supports package switch / reload */
  controls: boolean
  /** The action currently running on this package, if any */
  operation: string
}>()

const emit = defineEmits<{
  run: [action: 'start' | 'stop' | 'reload']
  update: []
  remove: []
}>()

function fileName(path: string) {
  return path.split(/[\\/]/).pop() || path
}
</script>

<style scoped src="../../plugins/components/detail.css"></style>
<style scoped>
.package-update {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 12px;
}
.package-update .md-button {
  grid-column: 2;
  justify-self: start;
}
.facts dd.path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
