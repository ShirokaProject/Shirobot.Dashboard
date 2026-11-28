<template>
  <div v-if="autoUpdate.available || checkable" class="auto-update">
    <div v-if="autoUpdate.available" class="auto-update-row">
      <MdIcon name="calendar_today" class="auto-update-icon" />
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

    <!-- Manual check: the result of the last one, and a button for another -->
    <div v-if="checkable" class="auto-update-row check-row" aria-live="polite">
      <MdIcon :name="statusIcon" class="auto-update-icon" :class="statusTone" />
      <span class="auto-update-text">
        <strong>{{ statusText }}</strong>
        <small v-if="checkedText">{{ checkedText }}</small>
      </span>
      <span class="check-actions">
        <button
          type="button"
          class="md-button tonal compact"
          :aria-busy="checking"
          :disabled="checking || updating"
          @click="emit('check')"
        >
          <MdIcon name="refresh" :class="{ spinning: checking }" />{{ checking ? '检查中' : '检查更新' }}
        </button>
        <button
          v-if="updateCount && !checking"
          type="button"
          class="md-button filled compact"
          :aria-busy="updating"
          :disabled="updating"
          @click="emit('updateAll')"
        >
          <MdIcon :name="updating ? 'refresh' : 'download'" :class="{ spinning: updating }" />{{ updating ? '更新中' : '全部更新' }}
        </button>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MdIcon from './MdIcon.vue'
import { autoUpdate, loadAutoUpdate, setAutoUpdateEnabled, type AutoUpdateKind } from '../features/autoUpdate'

/**
 * Shortcut for one host auto-update switch on the plugins / adapters page. It edits the same core config key as the
 * 配置中心, so the two never disagree; the schedule, restart policy and major-version rule stay in the 配置中心.
 */
const props = defineProps<{
  kind: AutoUpdateKind
  noun: string
  /** Installed items with a newer version; the check row shows only when this is given */
  updateCount?: number
  checking?: boolean
  /** 全部更新 is running */
  updating?: boolean
}>()

const emit = defineEmits<{ check: []; updateAll: [] }>()

const checkable = computed(() => typeof props.updateCount === 'number')
const statusIcon = computed(() => props.checking ? 'refresh' : props.updateCount ? 'arrow_upward' : 'check_circle')
const statusTone = computed(() => props.checking ? 'muted' : props.updateCount ? 'accent' : 'ok')
const statusText = computed(() => {
  if (props.checking) return '正在检查更新…'
  if (props.updating) return `正在更新 ${props.updateCount} 个${props.noun}…`
  return props.updateCount ? `${props.updateCount} 个${props.noun}可更新` : `${props.noun}都是最新版本`
})

// When the list last finished loading or checking; relative text refreshes each half minute
const checkedAt = ref<number | null>(props.checking ? null : Date.now())
const now = ref(Date.now())
watch(() => props.checking, (checking, was) => {
  if (was && !checking) checkedAt.value = Date.now()
})
const checkedText = computed(() => {
  if (props.checking || checkedAt.value === null) return ''
  const minutes = Math.floor((now.value - checkedAt.value) / 60000)
  if (minutes < 1) return '刚刚检查过'
  if (minutes < 60) return `${minutes} 分钟前检查`
  return `${Math.floor(minutes / 60)} 小时前检查`
})
let timer: number | undefined
onMounted(() => { timer = window.setInterval(() => { now.value = Date.now() }, 30000) })
onBeforeUnmount(() => window.clearInterval(timer))

const excludedCount = computed(() => autoUpdate.enabled[props.kind] ? autoUpdate.excluded[props.kind].length : 0)

// Fresh on every visit: the 配置中心 may have changed the settings meanwhile
onMounted(() => loadAutoUpdate(true))
</script>

<style scoped>
.auto-update {
  margin: 0 0 var(--md-space-3);
  padding: 0 var(--md-space-4);
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-surface-container);
}

.auto-update-row {
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
  padding: var(--md-space-3) 0;
}

.auto-update-row + .auto-update-row {
  border-top: 1px solid var(--md-sys-color-outline-variant);
}

.auto-update-icon.accent {
  color: var(--md-sys-color-primary);
}

.auto-update-icon.ok {
  color: var(--md-sys-color-on-surface-variant);
}

.check-actions {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--md-space-2);
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
