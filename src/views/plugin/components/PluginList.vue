<template>
  <section class="installed-panel" aria-label="已安装插件">
    <article
      v-for="plugin in plugins"
      :key="plugin.id"
      class="plugin-row"
      :class="[{ selected: selectedPlugin?.id === plugin.id }, plugin.status]"
      @click="emit('select', plugin)"
    >
      <div class="plugin-avatar" :class="plugin.status" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M20.5 11H19V7.5C19 6.67 18.33 6 17.5 6H14V4.5C14 3.12 12.88 2 11.5 2S9 3.12 9 4.5V6H5.5C4.67 6 4 6.67 4 7.5V11h1.5C6.88 11 8 12.12 8 13.5S6.88 16 5.5 16H4v3.5c0 .83.67 1.5 1.5 1.5H9v-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V21h3.5c.83 0 1.5-.67 1.5-1.5V16h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11Z" />
        </svg>
      </div>

      <div class="plugin-main">
        <div class="plugin-title-line">
          <div class="plugin-name-line">
            <h3>{{ plugin.name }}</h3>
            <span class="version-inline">v{{ plugin.version }}</span>
            <span v-if="plugin.hasUpdate" class="version-update">→ v{{ plugin.latestVersion }}</span>
          </div>
        </div>

        <div class="plugin-sub-line">
          <span>{{ plugin.author }}</span>
          <span>·</span>
          <span>{{ plugin.category }}</span>
          <span>·</span>
          <span class="plugin-desc">{{ plugin.description }}</span>
        </div>
      </div>

      <div class="plugin-actions" @click.stop>
        <span class="status-badge" :class="plugin.status">{{ statusText(plugin.status) }}</span>
        <el-switch
          :model-value="plugin.status === 'enabled'"
          :disabled="isToggleLocked(plugin)"
          @change="(value: string | number | boolean) => emit('toggle', plugin, Boolean(value))"
        />
        <button type="button" class="list-action-button text" @click="emit('select', plugin)">详情</button>
        <button v-if="plugin.hasUpdate" type="button" class="list-action-button tonal" @click="emit('update', plugin)">更新</button>
        <span v-else class="action-placeholder"></span>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import type { Plugin, PluginStatus } from '../../../features/plugins/types'

defineProps<{
  plugins: Plugin[]
  selectedPlugin: Plugin | null
  statusText: (status: PluginStatus) => string
  isToggleLocked: (plugin: Plugin) => boolean
}>()

const emit = defineEmits<{
  select: [plugin: Plugin]
  toggle: [plugin: Plugin, enabled: boolean]
  update: [plugin: Plugin]
}>()
</script>

<style scoped src="./PluginList.css"></style>
