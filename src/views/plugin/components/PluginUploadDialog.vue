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

      <el-upload
        drag
        :auto-upload="false"
        :limit="1"
        :show-file-list="false"
        accept=".dll"
        :on-change="handlePluginFileChange"
        :on-remove="handlePluginFileRemove"
      >
        <div class="upload-dropzone-text">
          <strong>{{ selectedFile ? '重新选择 DLL 文件' : '拖拽插件文件到这里' }}</strong>
          <span>{{ selectedFile ? '当前已选择 1 个待解析插件' : '或点击选择本地 .dll 文件' }}</span>
        </div>
      </el-upload>

      <div v-if="selectedFile" class="selected-file-panel">
        <div class="selected-file-icon" aria-hidden="true">DLL</div>
        <div class="selected-file-main">
          <span>待解析文件</span>
          <strong>{{ selectedFile.name }}</strong>
        </div>
        <button type="button" class="clear-file-button" @click="emit('update:selectedFile', null)">移除</button>
      </div>
    </div>

    <template #footer>
      <div class="upload-dialog-footer">
        <button type="button" class="md3-dialog-action text" @click="emit('update:visible', false)">
          取消
        </button>
        <button type="button" class="md3-dialog-action tonal" :disabled="!selectedFile" @click="emit('submit')">
          提交解析
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { UploadFile } from 'element-plus'

defineProps<{
  visible: boolean
  selectedFile: File | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:selectedFile': [value: File | null]
  submit: []
}>()

function handlePluginFileChange(file: UploadFile) {
  emit('update:selectedFile', file.raw ?? null)
}

function handlePluginFileRemove() {
  emit('update:selectedFile', null)
}
</script>

<style scoped src="./PluginUploadDialog.css"></style>
