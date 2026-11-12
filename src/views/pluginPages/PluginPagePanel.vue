<template>
  <WebPagePanel v-if="definition.kind === 'web'" :plugin-id="pluginId" :definition="definition" :owner-kind="ownerKind" />
  <LegacyPluginPagePanel v-else-if="legacyDefinition" :plugin-id="pluginId" :definition="legacyDefinition" />
  <ComponentPagePanel v-else :plugin-id="pluginId" :definition="definition" :owner-kind="ownerKind" />
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { PluginPage, LegacyPluginPage } from '../../api'
import LegacyPluginPagePanel from './LegacyPluginPagePanel.vue'
import ComponentPagePanel from './ComponentPagePanel.vue'
import WebPagePanel from './WebPagePanel.vue'
const props = defineProps<{ pluginId: string; definition: PluginPage; ownerKind?: 'plugins' | 'adapters' }>()
const legacyDefinition = computed(() => props.definition.kind ? props.definition as LegacyPluginPage : null)
</script>
