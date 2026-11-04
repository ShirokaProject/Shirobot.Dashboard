<template>
  <div v-if="autoUpdate.available" class="auto-update">
    <MdIcon name="refresh" class="auto-update-icon" />
    <span class="auto-update-text">
      <strong>每日自动更新</strong>
      <small>
        每天 {{ autoUpdate.time }} 更新已安装的{{ noun }}<template v-if="excludedCount">，{{ excludedCount }} 个除外</template> ·
        <router-link :to="{ path: '/config', query: { group: 'auto_update' } }">更多设置</router-link>
      </small>
    </span>
    <el-switch
      :model-value="autoUpdate.enabled[kind]"
      :loading="autoUpdate.saving"
      :aria-label="`每日自动更新${noun}`"
      @change="(value: string | number | boolean) => setAutoUpdateEnabled(kind, Boolean(value))"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import MdIcon from './MdIcon.vue'
import { autoUpdate, loadAutoUpdate, setAutoUpdateEnabled, type AutoUpdateKind } from '../features/autoUpdate'

/**
 * Shortcut for one host auto-update switch on the plugins / adapters page. It edits the same core config key as the
 * 配置中心, so the two never disagree; the schedule, restart policy and major-version rule stay in the 配置中心.
 */
const props = defineProps<{
  kind: AutoUpdateKind
  noun: string
}>()

const excludedCount = computed(() => autoUpdate.enabled[props.kind] ? autoUpdate.excluded[props.kind].length : 0)

// Fresh on every visit: the 配置中心 may have changed the settings meanwhile
onMounted(() => loadAutoUpdate(true))
</script>

<style scoped>
.auto-update {
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
  margin: 0 0 var(--md-space-3);
  padding: var(--md-space-3) var(--md-space-4);
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container);
}

.auto-update-icon {
  flex: 0 0 auto;
  color: var(--md-sys-color-on-surface-variant);
  font-size: 20px;
}

.auto-update-text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.auto-update-text strong {
  font: var(--md-sys-typescale-label-large);
}

.auto-update-text small {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.auto-update-text a {
  color: var(--md-sys-color-primary);
  text-decoration: none;
}

.auto-update-text a:hover {
  text-decoration: underline;
}
</style>
