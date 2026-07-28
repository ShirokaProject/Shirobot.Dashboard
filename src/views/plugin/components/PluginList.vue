<template>
  <section class="installed-grid" aria-label="已安装插件">
    <article
      v-for="plugin in plugins"
      :key="plugin.id"
      class="plugin-card"
      :class="[{ selected: selectedPlugin?.id === plugin.id }, plugin.status]"
      role="button"
      tabindex="0"
      :aria-pressed="selectedPlugin?.id === plugin.id"
      @click="emit('select', plugin)"
      @keydown.enter.prevent="emit('select', plugin)"
      @keydown.space.prevent="emit('select', plugin)"
    >
      <div class="card-top">
        <div class="plugin-avatar" :class="plugin.status" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M20.5 11H19V7.5C19 6.67 18.33 6 17.5 6H14V4.5C14 3.12 12.88 2 11.5 2S9 3.12 9 4.5V6H5.5C4.67 6 4 6.67 4 7.5V11h1.5C6.88 11 8 12.12 8 13.5S6.88 16 5.5 16H4v3.5c0 .83.67 1.5 1.5 1.5H9v-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V21h3.5c.83 0 1.5-.67 1.5-1.5V16h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11Z" />
          </svg>
        </div>

        <div class="card-title">
          <div class="name-line">
            <h3>{{ plugin.name }}</h3>
            <span class="card-version" :class="{ update: plugin.hasUpdate }">
              v{{ plugin.version }}
              <template v-if="plugin.hasUpdate">→ v{{ plugin.latestVersion }}</template>
            </span>
          </div>
        </div>

        <div class="card-actions">
          <button
            type="button"
            class="star-button"
            :class="{ active: isStarred(plugin) }"
            :aria-label="isStarred(plugin) ? `取消标星 ${plugin.name}` : `标星 ${plugin.name}`"
            :title="isStarred(plugin) ? '取消标星' : '标星'"
            @click.stop="emit('toggleStar', plugin)"
          >
            <MaterialSymbol :name="isStarred(plugin) ? 'star-filled' : 'star'" />
          </button>
        </div>
      </div>

      <p class="card-description">{{ plugin.description }}</p>

      <dl class="plugin-facts">
        <div class="plugin-fact developer-fact">
          <dt class="fact-icon" title="开发者">
            <MaterialSymbol name="about" />
            <span class="visually-hidden">开发者</span>
          </dt>
          <dd>{{ plugin.author }}</dd>
        </div>
      </dl>

      <div class="card-footer">
        <div class="runtime-control" :class="plugin.status" @click.stop>
          <el-switch
            :model-value="plugin.enabled"
            :disabled="isToggleLocked(plugin)"
            :loading="isTogglePending(plugin)"
            :aria-label="`启停 ${plugin.name}`"
            :title="isToggleLocked(plugin) ? '操作冷却中，请稍候' : ''"
            @change="(value: string | number | boolean) => emit('toggle', plugin, Boolean(value))"
          />
          <span>{{ statusText(plugin.status) }}</span>
        </div>
        <span class="detail-hint">查看详情 <span aria-hidden="true">→</span></span>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import MaterialSymbol from '../../../components/MaterialSymbol.vue'
import type { Plugin, PluginStatus } from '../../../features/plugins/types'

defineProps<{
  plugins: Plugin[]
  selectedPlugin: Plugin | null
  statusText: (status: PluginStatus) => string
  isStarred: (plugin: Plugin) => boolean
  isToggleLocked: (plugin: Plugin) => boolean
  isTogglePending: (plugin: Plugin) => boolean
}>()

const emit = defineEmits<{
  select: [plugin: Plugin]
  toggleStar: [plugin: Plugin]
  toggle: [plugin: Plugin, enabled: boolean]
}>()

</script>

<style scoped src="./PluginList.css"></style>
