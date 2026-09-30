<template>
  <img
    v-if="!failed"
    class="site-icon"
    :src="`https://${domain}/favicon.ico`"
    alt=""
    loading="lazy"
    referrerpolicy="no-referrer"
    @error="failed = true"
  />
  <MdIcon v-else name="link" class="site-icon" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import MdIcon from './MdIcon.vue'

// A site's own favicon (e.g. a self-hosted Gitea), falling back to a generic link icon.
const props = defineProps<{ domain: string }>()
const failed = ref(false)
watch(() => props.domain, () => { failed.value = false })
</script>

<style scoped>
.site-icon {
  width: 1em;
  height: 1em;
  flex: 0 0 auto;
  border-radius: 3px;
}
</style>
