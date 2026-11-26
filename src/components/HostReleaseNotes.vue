<template>
  <div v-if="text || url" class="release-notes">
    <template v-if="text">
      <button v-if="collapsible" type="button" class="notes-toggle" :aria-expanded="open" @click="open = !open">
        <MdIcon name="description" />
        <span>{{ open ? '收起更新日志' : '查看更新日志' }}</span>
        <MdIcon name="expand_more" class="chevron" :class="{ open }" />
      </button>
      <div v-show="open || !collapsible" class="notes-body">
        <SafeMarkdown :text="text" />
      </div>
    </template>
    <a v-if="url" :href="url" target="_blank" rel="noreferrer" class="notes-link">在 GitHub 查看发布说明</a>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MdIcon from './MdIcon.vue'
import SafeMarkdown from '../views/pluginPages/SafeMarkdown.vue'

/** The host release's notes (Markdown from GitHub), collapsed behind a toggle or shown outright. */
const props = withDefaults(defineProps<{
  notes?: string | null
  url?: string | null
  collapsible?: boolean
}>(), { notes: null, url: null, collapsible: true })

const open = ref(false)

// Only what changed: the release's download section (assets, Docker, NuGet) and everything after it is cut, as are
// the leading version / 更新日志 headings, HTML comments and runs of blank lines.
const DOWNLOAD_HEADING = /^#{1,6}\s*(下载|download)/i
const REDUNDANT_HEADING = /^#{1,6}\s*(v?\d+(\.\d+)+|更新日志|changelog|release notes)\s*$/i
const text = computed(() => {
  const lines = (props.notes ?? '').replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, '').split('\n')
  const cut = lines.findIndex(line => DOWNLOAD_HEADING.test(line.trim()))
  return (cut >= 0 ? lines.slice(0, cut) : lines)
    .filter(line => !REDUNDANT_HEADING.test(line.trim()))
    .filter((line, index, kept) => line.trim() || (index > 0 && kept[index - 1]!.trim()))
    .join('\n')
    .trim()
})
</script>

<style scoped>
.release-notes {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--md-space-2);
  min-width: 0;
}

.notes-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--md-space-1);
  height: 32px;
  margin-left: calc(-1 * var(--md-space-2));
  padding: 0 var(--md-space-2);
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: var(--md-sys-color-primary);
  cursor: pointer;
  font: var(--md-sys-typescale-label-large);
}

.notes-toggle:hover {
  background: var(--app-hover);
}

.notes-toggle .md-icon {
  font-size: 18px;
}

.chevron {
  transition: transform var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
}

.chevron.open {
  transform: rotate(180deg);
}

.notes-body {
  width: 100%;
  max-height: 360px;
  overflow: auto;
  padding: var(--md-space-3) var(--md-space-4);
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--md-sys-color-surface-container-low);
  color: var(--md-sys-color-on-surface);
  box-sizing: border-box;
  font: var(--md-sys-typescale-body-medium);
}

.notes-body :deep(h3),
.notes-body :deep(h4),
.notes-body :deep(h5) {
  margin: var(--md-space-3) 0 var(--md-space-1);
  font: var(--md-sys-typescale-title-small);
}

.notes-body :deep(h3:first-child),
.notes-body :deep(h4:first-child) {
  margin-top: 0;
}

.notes-body :deep(p) {
  margin: 0 0 var(--md-space-1);
}

.notes-body :deep(code) {
  padding: 0 4px;
  border-radius: 4px;
  background: var(--md-sys-color-surface-container-high);
  font-family: var(--font-mono);
  font-size: 0.92em;
}

.notes-link {
  color: var(--md-sys-color-primary);
  font: var(--md-sys-typescale-body-small);
}

@media (prefers-reduced-motion: reduce) {
  .chevron {
    transition: none;
  }
}
</style>
