<template>
  <!-- Same look as the plugin upload dialog: shared classes from PluginUploadDialog.css -->
  <el-dialog
    :model-value="visible"
    :title="title"
    width="560px"
    class="plugin-upload-dialog"
    modal-class="plugin-upload-overlay"
    append-to-body
    align-center
    :close-on-click-modal="!busy"
    :close-on-press-escape="!busy"
    :show-close="!busy"
    @update:model-value="handleVisibleChange"
  >
    <div class="upload-dialog-content">
      <div class="upload-hero explorer-hero" aria-hidden="true">
        <div class="explorer-window">
          <div class="explorer-titlebar"><span></span><span></span><span></span></div>
          <div class="explorer-body">
            <div class="explorer-sidebar"><span></span><span></span><span></span></div>
            <div class="explorer-files">
              <span class="file-row"></span>
              <span class="file-row short"></span>
              <div class="dll-file-card"><span class="file-corner"></span><strong>DLL</strong></div>
            </div>
          </div>
        </div>
        <span class="explorer-upload-arrow"></span>
        <span class="explorer-spark spark-one"></span>
        <span class="explorer-spark spark-two"></span>
      </div>

      <template v-if="!preview">
        <el-upload ref="upload" drag :auto-upload="false" :limit="1" :show-file-list="false" :disabled="busy" accept=".dll,.zip" :on-change="selectFile" :on-exceed="replaceFile">
          <div class="upload-dropzone-text">
            <strong>{{ file ? '重新选择适配器包' : '拖拽适配器包到这里' }}</strong>
            <span>{{ file ? '当前已选择 1 个待解析适配器包' : '或点击选择本地 .dll / .zip 文件' }}</span>
          </div>
        </el-upload>

        <div v-if="file" class="selected-file-panel">
          <div class="selected-file-icon" aria-hidden="true">{{ file.name.toLowerCase().endsWith('.zip') ? 'ZIP' : 'DLL' }}</div>
          <div class="selected-file-main">
            <span>待解析文件</span>
            <strong>{{ file.name }}</strong>
          </div>
          <button type="button" class="clear-file-button" :disabled="busy" @click="emit('update:file', null)">移除</button>
        </div>
      </template>

      <div v-else class="upload-result-panel">
        <div class="upload-result-head">
          <span class="upload-result-badge">已解析</span>
          <strong>{{ preview.adapter.name }}</strong>
          <small>{{ preview.adapter.id }} · v{{ preview.adapter.version }}</small>
        </div>

        <dl class="upload-result-list">
          <div><dt>平台</dt><dd>{{ preview.adapter.platform }}</dd></div>
          <div><dt>文件</dt><dd>{{ preview.packageName || '—' }} · {{ preview.packageType }}<template v-if="preview.packageSize !== null"> · {{ formatSize(preview.packageSize) }}</template></dd></div>
          <div v-if="preview.source"><dt>来源</dt><dd>{{ preview.source }}</dd></div>
        </dl>

        <p class="upload-plugin-description">{{ preview.adapter.description || '暂无适配器描述。' }}</p>

        <div v-if="preview.conflict" class="upload-conflict-panel">
          <strong>检测到已安装同 ID 适配器包</strong>
          <span>将替换 v{{ preview.installedVersion || '未知' }} 为 v{{ preview.adapter.version }}；此包的所有运行实例会重载，连接短暂中断，各实例配置保留。</span>
        </div>

        <label v-if="preview.conflict" class="upload-option-row">
          <span>替换共享程序集（所有实例生效）</span>
          <input type="checkbox" :checked="replace" @change="emit('update:replace', ($event.target as HTMLInputElement).checked)" />
        </label>
      </div>

      <div v-if="error || fileError" class="upload-error-panel">{{ fileError || error }}</div>
    </div>

    <template #footer>
      <div class="upload-dialog-footer">
        <button type="button" class="md3-dialog-action text" :disabled="busy" @click="emit('update:visible', false)">取消</button>
        <button v-if="!preview" type="button" class="md3-dialog-action tonal" :disabled="!file || busy" @click="emit('submit')">
          {{ busy ? '解析中...' : '预览安装' }}
        </button>
        <button v-else type="button" class="md3-dialog-action tonal" :disabled="busy || (preview.conflict && !replace)" @click="emit('confirm')">
          {{ busy ? '安装中...' : preview.conflict ? '确认替换并重载' : '确认安装' }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { genFileId, type UploadFile, type UploadInstance, type UploadRawFile } from 'element-plus'
import type { AdapterInstallPreview } from '../../../api'
import { packageFileError } from '../../../features/packages/fileDrop'

const props = defineProps<{ visible: boolean; title: string; file: File | null; preview: AdapterInstallPreview | null; replace: boolean; busy: boolean; error: string }>()
const emit = defineEmits<{ 'update:visible': [boolean]; 'update:file': [File | null]; 'update:replace': [boolean]; submit: []; confirm: [] }>()
const upload = ref<UploadInstance>()
const fileError = ref('')
watch(() => props.file, file => {
  if (file) fileError.value = ''
  else upload.value?.clearFiles()
})
watch(() => props.visible, visible => {
  if (!visible) { fileError.value = ''; upload.value?.clearFiles() }
})
async function selectFile(file: UploadFile) {
  if (props.busy || !file.raw) return
  fileError.value = packageFileError([file.raw], '适配器') || ''
  if (fileError.value) { upload.value?.clearFiles(); return }
  emit('update:file', file.raw)
  await nextTick()
  emit('submit')
}
// Parsing or installing must finish before the dialog can close.
function handleVisibleChange(value: boolean) {
  if (!value && props.busy) return
  emit('update:visible', value)
}
function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
function replaceFile(files: File[]) {
  if (props.busy) return
  fileError.value = packageFileError(files, '适配器') || ''
  if (fileError.value) return
  upload.value?.clearFiles()
  const file = files[0] as UploadRawFile
  file.uid = genFileId()
  upload.value?.handleStart(file)
}
</script>

<style scoped src="../../plugin/components/PluginUploadDialog.css"></style>
