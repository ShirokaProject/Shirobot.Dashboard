<template>
  <el-dialog
    :model-value="visible"
    title="上传插件"
    width="560px"
    class="plugin-upload-dialog"
    modal-class="plugin-upload-overlay"
    append-to-body
    align-center
    @update:model-value="emit('update:visible', $event)"
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

      <template v-if="!uploadResult">
        <el-upload
          drag
          :auto-upload="false"
          :limit="1"
          :show-file-list="false"
          accept=".dll,.zip"
          :on-change="handlePluginFileChange"
          :on-remove="handlePluginFileRemove"
        >
          <div class="upload-dropzone-text">
            <strong>{{ selectedFile ? '重新选择插件文件' : '拖拽插件文件到这里' }}</strong>
            <span>{{ selectedFile ? '当前已选择 1 个待解析插件' : '或点击选择本地 .dll / .zip 文件' }}</span>
          </div>
        </el-upload>

        <div v-if="selectedFile" class="selected-file-panel">
          <div class="selected-file-icon" aria-hidden="true">{{ selectedFile.name.endsWith('.zip') ? 'ZIP' : 'DLL' }}</div>
          <div class="selected-file-main">
            <span>待解析文件</span>
            <strong>{{ selectedFile.name }}</strong>
          </div>
          <button type="button" class="clear-file-button" @click="emit('update:selectedFile', null)">移除</button>
        </div>
      </template>

      <div v-else class="upload-result-panel">
        <div class="upload-result-head">
          <span class="upload-result-badge">已解析</span>
          <strong>{{ uploadResult.plugin.name }}</strong>
          <small>{{ uploadResult.plugin.id }} · v{{ uploadResult.plugin.version }}</small>
        </div>

        <dl class="upload-result-list">
          <div>
            <dt>作者</dt>
            <dd>{{ uploadResult.plugin.author || 'Unknown' }}</dd>
          </div>
          <div>
            <dt>分类</dt>
            <dd>{{ uploadResult.plugin.category || 'Other' }}</dd>
          </div>
          <div>
            <dt>仓库</dt>
            <dd>{{ uploadResult.plugin.repo || '—' }}</dd>
          </div>
          <div>
            <dt>文件</dt>
            <dd>{{ uploadResult.package.file_name }} · {{ uploadResult.package.type }} · {{ formatSize(uploadResult.package.size) }}</dd>
          </div>
        </dl>

        <p class="upload-plugin-description">{{ uploadResult.plugin.description || '暂无插件描述。' }}</p>

        <div v-if="uploadResult.conflict?.exists" class="upload-conflict-panel">
          <strong>检测到已安装同 ID 插件</strong>
          <span>将替换 {{ uploadResult.conflict.installed_version || '当前版本' }} 为 {{ uploadResult.conflict.uploaded_version || uploadResult.plugin.version }}</span>
        </div>

        <label class="upload-option-row" v-if="uploadResult.conflict?.exists">
          <span>替换已安装插件</span>
          <input type="checkbox" :checked="replace" @change="emit('update:replace', ($event.target as HTMLInputElement).checked)" />
        </label>

        <label class="upload-option-row">
          <span>安装后启用插件</span>
          <input type="checkbox" :checked="enable" @change="emit('update:enable', ($event.target as HTMLInputElement).checked)" />
        </label>
      </div>

      <div v-if="uploadError" class="upload-error-panel">{{ uploadError }}</div>
    </div>

    <template #footer>
      <div class="upload-dialog-footer">
        <button type="button" class="md3-dialog-action text" @click="emit('update:visible', false)">
          取消
        </button>
        <button v-if="!uploadResult" type="button" class="md3-dialog-action tonal" :disabled="!selectedFile || parsing" @click="emit('submit')">
          {{ parsing ? '解析中...' : '提交解析' }}
        </button>
        <button v-else type="button" class="md3-dialog-action tonal" :disabled="installing" @click="emit('confirm')">
          {{ installing ? '安装中...' : '确认安装' }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { UploadFile } from 'element-plus'
import type { PluginUploadParsedResponse } from '../../../api'

defineProps<{
  visible: boolean
  selectedFile: File | null
  uploadResult: PluginUploadParsedResponse | null
  uploadError: string
  parsing: boolean
  installing: boolean
  replace: boolean
  enable: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:selectedFile': [value: File | null]
  'update:replace': [value: boolean]
  'update:enable': [value: boolean]
  submit: []
  confirm: []
}>()

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function handlePluginFileChange(file: UploadFile) {
  emit('update:selectedFile', file.raw ?? null)
}

function handlePluginFileRemove() {
  emit('update:selectedFile', null)
}
</script>

<style scoped src="./PluginUploadDialog.css"></style>
