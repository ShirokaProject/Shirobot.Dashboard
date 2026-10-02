<template>
  <el-dialog
    :model-value="visible"
    class="config-workspace"
    width="880px"
    append-to-body
    align-center
    :show-close="false"
    :before-close="requestClose"
  >
    <template #header>
      <div class="ws-head">
        <div class="ws-title">
          <h2>{{ pluginName }}</h2>
          <p>{{ target === 'adapter' ? '适配器配置' : '插件配置' }}</p>
        </div>
        <button type="button" class="md-button text icon-only compact" aria-label="关闭" @click="requestClose()">
          <MdIcon name="close" />
        </button>
      </div>
    </template>

    <p v-if="state.loadError.value" class="ws-note error">{{ state.loadError.value }}</p>
    <div v-else-if="state.loading.value" class="ws-note">正在读取配置…</div>
    <!-- Categories on the left as pills; only the chosen one is shown on the right -->
    <div v-else class="ws-body">
      <ConfigNav
        v-model:view="view"
        class="ws-nav"
        :groups="state.groups.value"
        :show-routes="state.hasRoutes.value"
        :show-instance="target === 'adapter'"
      />
      <div class="ws-content">
        <PluginConfigForm
          v-model:instance="instanceDraft"
          :instance-error="instanceDirty ? idError : ''"
          v-model:route-groups="state.routeGroups.value"
          :view="view"
          :groups="state.groups.value"
          :config="state.config"
          :routes="state.routes"
        />
      </div>
    </div>

    <template #footer>
      <div class="ws-foot">
        <button type="button" class="md-button text" @click="openFullPage">
          <MdIcon name="open_in_new" />在完整页面打开
        </button>
        <span v-if="state.saveMessage.value && !dirty" class="ws-saved" :class="state.saveMessageType.value">
          {{ state.saveMessage.value }}
        </span>
        <span v-else-if="dirty" class="ws-dirty"><span class="status-dot warning" aria-hidden="true"></span>有未保存的修改</span>
        <div class="button-group">
          <button type="button" class="md-button tonal" @click="requestClose()">{{ dirty ? '取消' : '关闭' }}</button>
          <button
            type="button"
            class="md-button filled"
            :disabled="!dirty || state.saving.value || instanceSaving || Boolean(instanceDirty && idError)"
            @click="save"
          >保存</button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApiErrorMessage, updateAdapterInstance } from '../../../api'
import MdIcon from '../../../components/MdIcon.vue'
import { INSTANCE_VIEW, ROUTES_VIEW, usePluginConfig, type ConfigTarget } from '../usePluginConfig'
import ConfigNav from './ConfigNav.vue'
import PluginConfigForm from './PluginConfigForm.vue'

const props = withDefaults(defineProps<{ visible: boolean; pluginId: string; pluginName: string; target?: ConfigTarget }>(), { target: 'plugin' })
const emit = defineEmits<{
  'update:visible': [visible: boolean]
  /** An adapter instance's name / ID was saved; carries its (possibly new) ID */
  'instance-saved': [id: string]
}>()

const router = useRouter()

// Only load while open; reopening the same plugin reloads fresh values.
const activeId = computed(() => props.visible ? props.pluginId : '')
const state = usePluginConfig(activeId, () => props.target)

// Current category: a group key or ROUTES_VIEW. Starts on the first group each time.
const view = ref('')
watch(() => state.groups.value, groups => {
  // Still loading: leave the choice for when the groups arrive.
  if (!groups.length) return
  if (view.value === ROUTES_VIEW || view.value === INSTANCE_VIEW || groups.some(group => group.key === view.value)) return
  view.value = groups[0].key
})
watch(() => props.visible, open => {
  if (open) view.value = state.groups.value[0]?.key ?? ''
})
// An adapter without config fields still has its instance section to show.
watch(() => state.loading.value, loading => {
  if (!loading && !view.value && !state.groups.value.length && props.target === 'adapter') view.value = INSTANCE_VIEW
})

// Instance name / ID drafts (adapters only), reset whenever the dialog opens or the instance changes.
const instanceDraft = ref<{ id: string; name: string } | null>(null)
const instanceSaving = ref(false)
watch(() => [props.visible, props.pluginId, props.pluginName, props.target], () => {
  instanceDraft.value = props.target === 'adapter' ? { id: props.pluginId, name: props.pluginName } : null
}, { immediate: true })
const draftId = computed(() => instanceDraft.value?.id ?? '')
const draftName = computed(() => instanceDraft.value?.name ?? '')
const instanceDirty = computed(() => props.target === 'adapter' &&
  (draftId.value.trim() !== props.pluginId || draftName.value.trim() !== props.pluginName))
// Same rule the host enforces, so the mistake shows before the round trip.
const idError = computed(() => {
  const id = draftId.value.trim()
  if (!id) return '实例 ID 不能为空。'
  return /^[A-Za-z0-9._-]{1,64}$/.test(id) ? '' : '实例 ID 最多 64 个字符，只能使用英文字母、数字、点、横线和下划线。'
})
const dirty = computed(() => state.dirty.value || instanceDirty.value)

async function confirmDiscard() {
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm('修改还没有保存，关闭后会丢失。', '放弃修改？', {
      confirmButtonText: '放弃修改',
      cancelButtonText: '继续编辑',
      confirmButtonClass: 'el-button--danger'
    })
    return true
  } catch {
    return false
  }
}

async function requestClose(done?: () => void) {
  if (!(await confirmDiscard())) return
  emit('update:visible', false)
  done?.()
}

// Stay open after saving so several changes can be made in one sitting.
// Config first, under the current ID; then the name / ID, which may restart the instance under a new one.
async function save() {
  if (state.dirty.value && !(await state.save())) return
  if (instanceDirty.value) {
    if (idError.value) { view.value = INSTANCE_VIEW; return }
    instanceSaving.value = true
    try {
      const response = await updateAdapterInstance(props.pluginId, draftId.value.trim(), draftName.value.trim())
      emit('instance-saved', response.adapter?.id || draftId.value.trim())
      if (!response.ok) { ElMessage.warning(response.message); return }
    } catch (cause) {
      ElMessage.error(getApiErrorMessage(cause, '保存实例失败。'))
      return
    } finally { instanceSaving.value = false }
  }
  ElMessage.success('配置已保存')
}

async function openFullPage() {
  if (!(await confirmDiscard())) return
  emit('update:visible', false)
  const base = props.target === 'adapter' ? 'adapters' : 'plugins'
  void router.push(`/${base}/${encodeURIComponent(props.pluginId)}/config`)
}
</script>

<style scoped>
.ws-head {
  display: flex;
  align-items: center;
  gap: var(--md-space-4);
}

.ws-title {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--md-space-2);
}

.ws-title h2 {
  margin: 0;
  overflow: hidden;
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-title-large);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-title p {
  margin: 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.md-button.icon-only.compact {
  width: 36px;
  color: var(--md-sys-color-on-surface-variant);
}

/* Nav | content; height follows the content (no empty well under short categories),
   capped so long ones scroll inside while header and footer stay put */
.ws-body {
  min-height: 360px;
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  align-items: start;
  gap: var(--md-space-5);
}

.ws-nav,
.ws-content {
  max-height: min(72vh, 760px);
  overflow-y: auto;
}

.ws-nav {
  padding: var(--md-space-1) 0 var(--md-space-2);
}

.ws-content {
  min-width: 0;
  padding: var(--md-space-1) var(--md-space-1) var(--md-space-4);
}

@media (max-width: 599px) {
  .ws-body {
    height: auto;
    max-height: 70vh;
    grid-template-columns: minmax(0, 1fr);
  }

  .ws-nav {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

.ws-note {
  padding: var(--md-space-8) 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-medium);
  text-align: center;
}

.ws-note.error {
  color: var(--md-sys-color-error);
}

.ws-foot {
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
}

.ws-foot > .md-button.text {
  margin-left: calc(var(--md-space-3) * -1);
}

.ws-foot .md-icon {
  font-size: 18px;
}

.ws-dirty,
.ws-saved {
  display: inline-flex;
  align-items: center;
  gap: var(--md-space-2);
  margin-left: auto;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.ws-saved.error {
  color: var(--md-sys-color-error);
}

.ws-foot .button-group {
  margin-left: auto;
}

.ws-dirty + .button-group,
.ws-saved + .button-group {
  margin-left: 0;
}

:global(.config-workspace.el-dialog) {
  padding: 0;
}

:global(.config-workspace .el-dialog__header) {
  padding: var(--md-space-5) var(--md-space-6) var(--md-space-3);
  margin: 0;
}

:global(.config-workspace .el-dialog__body) {
  padding: 0 var(--md-space-4);
}

:global(.config-workspace .el-dialog__footer) {
  padding: var(--md-space-3) var(--md-space-4);
  border-top: 1px solid var(--md-sys-color-outline-variant);
}
</style>
