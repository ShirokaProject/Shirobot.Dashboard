<template>
  <div v-if="available" class="auto-update">
    <MdIcon name="refresh" class="auto-update-icon" />
    <span class="auto-update-text">
      <strong>每日自动更新</strong>
      <small>
        每天 {{ time }} 更新已安装的{{ noun }} ·
        <router-link :to="{ path: '/config', query: { group: 'auto_update' } }">更多设置</router-link>
      </small>
    </span>
    <el-switch
      :model-value="enabled"
      :loading="saving"
      :aria-label="`每日自动更新${noun}`"
      @change="(value: string | number | boolean) => save(Boolean(value))"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MdIcon from './MdIcon.vue'
import { getApiErrorMessage, getAppConfig, updateAppConfig } from '../api'
import { toastError } from '../features/toast'

/**
 * Shortcut for one host auto-update switch on the plugins / adapters page. It edits the same core config key
 * as the 配置中心, so the two never disagree; the schedule and restart policy stay in the 配置中心.
 */
const props = defineProps<{
  configKey: 'auto_update_plugins' | 'auto_update_adapters'
  noun: string
}>()

const available = ref(false)
const enabled = ref(false)
const time = ref('02:00')
const saving = ref(false)

onMounted(async () => {
  try {
    const { config } = await getAppConfig()
    // Hosts before auto-update have no such key: hide the shortcut instead of offering a switch that does nothing
    if (typeof config?.[props.configKey] !== 'boolean') return
    enabled.value = config[props.configKey] as boolean
    if (typeof config.auto_update_time === 'string' && config.auto_update_time) time.value = config.auto_update_time
    available.value = true
  } catch {
    // The page works without it; the 配置中心 shows the real error
  }
})

async function save(value: boolean) {
  saving.value = true
  try {
    await updateAppConfig({ [props.configKey]: value })
    enabled.value = value
  } catch (error) {
    toastError(getApiErrorMessage(error, '保存自动更新设置失败'))
  } finally {
    saving.value = false
  }
}
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
