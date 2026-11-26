<template>
  <el-dialog
    v-model="visible"
    :title="`主程序已更新到 v${version}`"
    width="560px"
    append-to-body
    align-center
    class="host-updated-dialog"
  >
    <p class="updated-from">从 v{{ previous }} 更新而来，以下是这个版本的更新内容。</p>
    <HostReleaseNotes :notes="notes" :url="url" :collapsible="false" />
    <template #footer>
      <button type="button" class="md-button filled" @click="visible = false">知道了</button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import HostReleaseNotes from '../../components/HostReleaseNotes.vue'
import { getDashboardSession } from '../../auth/session'
import { compareVersions } from '../../features/plugins/updates'
import { hostUpdateSnapshot } from '../../features/plugins/updateCounts'

/**
 * Once per backend after its host moves to a newer version: shows what that version changed. The version last seen
 * is kept per backend in this browser; the first visit only records it, so nobody is greeted with old notes.
 * Notes are shown only when the running version is the latest release, since the check returns the latest's notes.
 */
const visible = ref(false)
const version = ref('')
const previous = ref('')
const notes = ref<string | null>(null)
const url = ref<string | null>(null)

function storageKey() {
  const session = getDashboardSession()
  return `shirobot.dashboard.seen-host-version:${session?.mode === 'api' ? session.backendId ?? 'local' : 'demo'}`
}

// Decided once per page load, on the first successful check
let decided = false
watch(hostUpdateSnapshot, check => {
  if (decided || !check?.current_version) return
  decided = true
  const current = check.current_version
  let seen: string | null = null
  try {
    seen = localStorage.getItem(storageKey())
    localStorage.setItem(storageKey(), current)
  } catch {
    return
  }

  const notesMatch = !check.update_available && check.latest_version === current && Boolean(check.release_notes?.trim())
  if (!seen || compareVersions(current, seen) <= 0 || !notesMatch) return
  version.value = current
  previous.value = seen
  notes.value = check.release_notes
  url.value = check.release_url
  visible.value = true
}, { immediate: true })
</script>

<style scoped>
.updated-from {
  margin: 0 0 var(--md-space-3);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium);
}
</style>
