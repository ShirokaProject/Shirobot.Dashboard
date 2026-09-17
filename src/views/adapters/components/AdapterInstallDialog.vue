<template>
  <el-dialog :model-value="visible" :title="title" width="560px" append-to-body align-center :close-on-click-modal="!busy" :show-close="!busy" @update:model-value="emit('update:visible', $event)">
    <div class="adapter-install-dialog">
      <template v-if="!preview">
        <el-upload drag :auto-upload="false" :limit="1" :show-file-list="false" accept=".dll,.zip" :on-change="selectFile">
          <strong>拖拽 Adapter 包到这里</strong>
          <span>或点击选择本地 .dll / .zip 文件</span>
        </el-upload>
        <p v-if="file" class="selected-file">待解析：{{ file.name }}</p>
      </template>
      <template v-else>
        <el-alert title="确认后宿主会短暂重载 Adapter，期间对应平台连接可能中断。" type="warning" :closable="false" show-icon />
        <dl class="preview-list">
          <div><dt>名称</dt><dd>{{ preview.adapter.name }}</dd></div>
          <div><dt>ID</dt><dd>{{ preview.adapter.id }}</dd></div>
          <div><dt>版本</dt><dd>{{ preview.adapter.version }}</dd></div>
          <div><dt>平台</dt><dd>{{ preview.adapter.platform }}</dd></div>
          <div><dt>包</dt><dd>{{ preview.packageName || '—' }} · {{ preview.packageType }}</dd></div>
          <div v-if="preview.source"><dt>来源</dt><dd>{{ preview.source }}</dd></div>
        </dl>
        <el-alert v-if="preview.conflict" :title="`检测到已安装版本 ${preview.installedVersion || '未知'}，确认后将替换。`" type="warning" :closable="false" show-icon />
        <el-checkbox v-if="preview.conflict" :model-value="replace" @update:model-value="emit('update:replace', $event)">替换已安装 Adapter</el-checkbox>
      </template>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    </div>
    <template #footer>
      <el-button :disabled="busy" @click="emit('update:visible', false)">取消</el-button>
      <el-button v-if="!preview" type="primary" :disabled="!file" :loading="busy" @click="emit('submit')">{{ busy ? '解析中...' : '预览安装' }}</el-button>
      <el-button v-else type="primary" :disabled="preview.conflict && !replace" :loading="busy" @click="emit('confirm')">{{ busy ? '安装中...' : '确认安装并重载' }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { UploadFile } from 'element-plus'
import type { AdapterInstallPreview } from '../../../api'

defineProps<{ visible: boolean; title: string; file: File | null; preview: AdapterInstallPreview | null; replace: boolean; busy: boolean; error: string }>()
const emit = defineEmits<{ 'update:visible': [boolean]; 'update:file': [File | null]; 'update:replace': [boolean]; submit: []; confirm: [] }>()
function selectFile(file: UploadFile) { emit('update:file', file.raw ?? null) }
</script>

<style scoped>
.adapter-install-dialog { display: flex; flex-direction: column; gap: 16px; }
.adapter-install-dialog :deep(.el-upload), .adapter-install-dialog :deep(.el-upload-dragger) { width: 100%; }
.adapter-install-dialog :deep(.el-upload-dragger) { display: flex; flex-direction: column; justify-content: center; gap: 8px; min-height: 150px; }
.selected-file { margin: 0; color: var(--md-sys-color-on-surface-variant); }
.preview-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 0; }
.preview-list dt { color: var(--md-sys-color-on-surface-variant); font: var(--md-sys-typescale-label-medium); }
.preview-list dd { margin: 3px 0 0; overflow-wrap: anywhere; }
@media (max-width: 599px) { .preview-list { grid-template-columns: 1fr; } }
</style>
