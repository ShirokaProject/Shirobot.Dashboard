<template>
  <div class="plugin-config-page" :class="{ embedded }">
    <el-alert
      v-if="loadError"
      class="page-alert"
      :title="loadError"
      type="warning"
      show-icon
      :closable="false"
    />

    <div aria-live="polite">
      <el-alert
        v-if="saveMessage"
        class="page-alert"
        :title="saveMessage"
        :type="saveMessageType"
        show-icon
        :closable="saveMessageType === 'error'"
        @close="saveMessage = ''"
      />
    </div>

    <section class="config-header-card">
      <div class="plugin-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M20.5 11H19V7.5C19 6.67 18.33 6 17.5 6H14V4.5C14 3.12 12.88 2 11.5 2S9 3.12 9 4.5V6H5.5C4.67 6 4 6.67 4 7.5V11h1.5C6.88 11 8 12.12 8 13.5S6.88 16 5.5 16H4v3.5c0 .83.67 1.5 1.5 1.5H9v-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V21h3.5c.83 0 1.5-.67 1.5-1.5V16h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11Z" />
        </svg>
      </div>
      <div class="header-main">
        <div class="eyebrow">插件配置</div>
        <h2>{{ pluginName }}</h2>
        <p>配置插件运行参数和群组路由规则。</p>
      </div>
      <div v-if="!embedded" class="header-actions m3-form-actions">
        <el-button round @click="$router.push('/plugins')">返回插件</el-button>
        <el-button round type="primary" :loading="saving" @click="savePluginConfig">保存配置</el-button>
      </div>
      <button v-else type="button" class="embedded-close-button" aria-label="关闭配置面板" @click="emit('close')">
        <MaterialSymbol name="close" />
      </button>
    </section>

    <section class="config-layout">
      <aside class="config-sections" role="tablist" aria-label="配置分区">
        <button
          v-for="section in sections"
          :key="section.key"
          type="button"
          role="tab"
          class="section-item"
          :class="{ active: activeSection === section.key }"
          :aria-selected="activeSection === section.key"
          @click="activeSection = section.key"
        >
          <span>
            <strong>{{ section.label }}</strong>
            <small>{{ section.description }}</small>
          </span>
        </button>
      </aside>

      <main class="config-editor">
        <div v-if="activeSection === 'config'" class="form-card">
          <div class="form-card-head">
            <h3>插件配置</h3>
            <p>字段由后端 schema 动态生成。</p>
          </div>

          <el-empty v-if="!schema.length" description="暂无配置 schema。" />

          <el-form v-else label-position="top" class="m3-form">
            <el-form-item v-for="item in schema" :key="item.key" :label="item.label || item.key">
              <template v-if="fieldType(item) === 'select'">
                <el-select v-model="config[item.key]" style="width: 100%" :placeholder="item.placeholder || '请选择'">
                  <el-option v-for="option in item.options || []" :key="String(option)" :label="String(option)" :value="option" />
                </el-select>
              </template>

              <template v-else-if="fieldType(item) === 'boolean'">
                <div class="switch-row compact" @click="config[item.key] = !config[item.key]">
                  <div>
                    <strong>{{ item.label || item.key }}</strong>
                    <p v-if="item.description">{{ item.description }}</p>
                  </div>
                  <el-switch v-model="config[item.key]" :aria-label="item.label || item.key" @click.stop />
                </div>
              </template>

              <template v-else-if="fieldType(item) === 'number'">
                <!-- M3 slider for bounded ranges; free number input otherwise -->
                <div v-if="item.min != null && item.max != null" class="slider-row">
                  <el-slider
                    :model-value="Number(config[item.key] ?? item.min)"
                    :min="item.min"
                    :max="item.max"
                    :aria-label="item.label || item.key"
                    @update:model-value="(value: number | number[]) => { config[item.key] = Array.isArray(value) ? value[0] : value }"
                  />
                  <span class="slider-value" aria-hidden="true">{{ Number(config[item.key] ?? item.min) }}</span>
                </div>
                <el-input-number v-else v-model="config[item.key]" :min="item.min ?? undefined" :max="item.max ?? undefined" style="width: 100%" />
              </template>

              <template v-else-if="fieldType(item) === 'text'">
                <el-input v-model="config[item.key]" type="textarea" :rows="4" :placeholder="item.placeholder || ''" />
              </template>

              <template v-else>
                <el-input v-model="config[item.key]" :placeholder="item.placeholder || ''" />
              </template>

              <p v-if="item.description && fieldType(item) !== 'boolean'" class="field-description">{{ item.description }}</p>
            </el-form-item>
          </el-form>
        </div>

        <div v-else class="form-card">
          <div class="form-card-head">
            <h3>路由配置</h3>
            <p>控制插件在哪些群组中生效。</p>
          </div>

          <el-form label-position="top" class="m3-form">
            <el-form-item label="路由模式">
              <el-select v-model="routes.mode" style="width: 100%">
                <el-option label="使用默认规则" value="default" />
                <el-option label="黑名单" value="blacklist" />
                <el-option label="白名单" value="whitelist" />
              </el-select>
            </el-form-item>

            <el-form-item label="群组列表">
              <el-input
                v-model="routeGroupsInput"
                :disabled="routes.mode === 'default'"
                placeholder="多个群组或频道 ID 可用逗号或空格分隔"
              />
              <p class="field-description">当模式为黑名单或白名单时生效。</p>
            </el-form-item>
          </el-form>
        </div>
      </main>

      <aside class="config-inspector">
        <section class="inspector-card">
          <h3>路由摘要</h3>
          <div class="kv-list">
            <div>
              <span>已单独配置</span>
              <strong>{{ routes.configured ? '是' : '否' }}</strong>
            </div>
            <div>
              <span>有效模式</span>
              <strong>{{ routeModeLabel(routes.effective_mode) }}</strong>
            </div>
            <div>
              <span>有效群组</span>
              <strong>{{ routes.effective_groups.length ? routes.effective_groups.join(', ') : '无' }}</strong>
            </div>
            <div>
              <span>默认模式</span>
              <strong>{{ routeModeLabel(routes.default_mode) }}</strong>
            </div>
          </div>
        </section>
      </aside>
    </section>

    <footer v-if="embedded" class="embedded-config-actions">
      <el-button round @click="emit('openFull')">完整页面</el-button>
      <el-button round type="primary" :loading="saving" @click="savePluginConfig">保存配置</el-button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MaterialSymbol from '../../components/MaterialSymbol.vue'
import { usePluginConfigPage } from './PluginConfig'

const props = withDefaults(defineProps<{
  pluginId?: string
  pluginName?: string
  embedded?: boolean
}>(), {
  pluginId: '',
  pluginName: '',
  embedded: false
})

const emit = defineEmits<{
  close: []
  openFull: []
}>()

const pluginIdSource = computed(() => props.pluginId || '')

const {
  pluginName: routePluginName,
  sections,
  activeSection,
  schema,
  config,
  routes,
  routeGroupsInput,
  loadError,
  saveMessage,
  saveMessageType,
  saving,
  fieldType,
  savePluginConfig
} = usePluginConfigPage(props.pluginId ? pluginIdSource : undefined)

const pluginName = computed(() => props.pluginName || routePluginName.value)

function routeModeLabel(mode: string) {
  return { default: '默认规则', blacklist: '黑名单', whitelist: '白名单' }[mode] ?? mode
}
</script>

<style scoped src="./PluginConfig.css"></style>
