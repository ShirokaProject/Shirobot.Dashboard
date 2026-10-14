<template>
  <section v-if="notice.recommended" class="restart-notice" role="status" aria-live="polite">
    <MdIcon name="restart_alt" class="notice-icon" />
    <div class="notice-copy">
      <strong>建议重启宿主</strong>
      <p v-for="reason in notice.reasons" :key="reason">{{ reason }}</p>
    </div>
    <button type="button" class="md-button tonal" :disabled="pending" @click="restart">
      {{ pending ? '处理中…' : '现在重启' }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import MdIcon from '../../components/MdIcon.vue'
import { ApiError, HOST_STATE_CHANGED_EVENT } from '../../api/core/http'
import { getRestartNotice } from '../../api/system/system'
import { offerHostRestart } from '../../features/hostPower/pendingRestart'
import { normalizeRestartNotice } from '../../features/hostPower/restartNotice'

const props = defineProps<{ scope: 'plugin' | 'adapter' }>()
const notice = ref(normalizeRestartNotice(null))
const pending = ref(false)
let supported = true
let active = true
let fetching = false
let refreshQueued = false
let controller: AbortController | undefined
let interval: number | undefined
let refreshTimer: number | undefined

async function refresh() {
  if (!active || !supported || document.hidden) return
  if (fetching) { refreshQueued = true; return }
  fetching = true
  try {
    controller = new AbortController()
    const result = await getRestartNotice(props.scope, controller.signal)
    if (active) notice.value = normalizeRestartNotice(result)
  } catch (error) {
    // Older hosts have no endpoint. Do not keep polling or display a false warning.
    if (error instanceof ApiError && error.status === 404) {
      supported = false
      window.clearInterval(interval)
    }
    // Preserve an existing notice across temporary disconnects, including host restart.
  } finally {
    fetching = false
    controller = undefined
    if (refreshQueued && active && supported) {
      refreshQueued = false
      scheduleRefresh()
    }
  }
}

function scheduleRefresh() {
  window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => { void refresh() }, 100)
}

async function restart() {
  if (pending.value) return
  pending.value = true
  try { await offerHostRestart(notice.value.reasons.join('\n')) }
  finally { pending.value = false }
}

onMounted(() => {
  void refresh()
  interval = window.setInterval(() => { void refresh() }, 15000)
  window.addEventListener(HOST_STATE_CHANGED_EVENT, scheduleRefresh)
  document.addEventListener('visibilitychange', scheduleRefresh)
})
onBeforeUnmount(() => {
  active = false
  controller?.abort()
  window.clearInterval(interval)
  window.clearTimeout(refreshTimer)
  window.removeEventListener(HOST_STATE_CHANGED_EVENT, scheduleRefresh)
  document.removeEventListener('visibilitychange', scheduleRefresh)
})
</script>

<style scoped>
.restart-notice {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px 20px;
  border-radius: 16px;
  background: var(--md-sys-color-tertiary-container);
  color: var(--md-sys-color-on-tertiary-container);
}
.notice-icon { flex-shrink: 0; font-size: 24px; }
.notice-copy { flex: 1; min-width: 0; }
.notice-copy strong { font-size: 15px; }
.notice-copy p { margin: 4px 0 0; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
.restart-notice button { flex-shrink: 0; }
@media (max-width: 600px) {
  .restart-notice { flex-wrap: wrap; padding: 16px; }
  .notice-copy { flex-basis: calc(100% - 40px); }
  .restart-notice button { margin-left: 40px; }
}
</style>
