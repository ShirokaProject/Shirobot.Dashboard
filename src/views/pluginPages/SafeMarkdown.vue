<template>
  <div class="safe-markdown"><component :is="line.tag" v-for="(line, i) in lines" :key="i"><template v-for="(part, j) in line.parts" :key="j"><strong v-if="part.kind === 'bold'">{{ part.text }}</strong><em v-else-if="part.kind === 'italic'">{{ part.text }}</em><code v-else-if="part.kind === 'code'">{{ part.text }}</code><a v-else-if="part.kind === 'link'" :href="part.url" target="_blank" rel="noopener noreferrer">{{ part.text }}</a><template v-else>{{ part.text }}</template></template></component></div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ text: string }>()
// Basic Markdown is rendered as Vue text nodes. Plugin HTML is never interpreted.
function parts(text: string) {
  const output: Array<{ kind: string; text: string; url?: string }> = []; let last = 0
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) output.push({ kind: 'text', text: text.slice(last, match.index) })
    output.push({ kind: match[1] ? 'bold' : match[2] ? 'code' : match[3] ? 'italic' : 'link', text: match[1] || match[2] || match[3] || match[4]!, url: match[5] })
    last = match.index + match[0].length
  }
  if (last < text.length) output.push({ kind: 'text', text: text.slice(last) })
  return output
}
const lines = computed(() => { let code = false; return props.text.split('\n').map(text => {
  if (text.startsWith('```')) { code = !code; return { tag: 'span', parts: [] } }
  if (code) return { tag: 'pre', parts: [{ kind: 'text', text }] }
  const heading = /^(#{1,4})\s+(.*)$/.exec(text)
  return { tag: heading ? `h${heading[1]!.length + 2}` : 'p', parts: parts(heading ? heading[2]! : text.replace(/^[-*] /, '• ')) }
}) })
</script>
<style scoped>
.safe-markdown { overflow-wrap: anywhere; white-space: pre-wrap; }
p, pre { margin: 0 0 var(--md-space-2); }
</style>
