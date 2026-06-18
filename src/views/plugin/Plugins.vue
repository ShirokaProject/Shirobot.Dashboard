<template>
  <div class="plugins-page">
    <PluginToolbar v-model:keyword="keyword" @upload="uploadDialogVisible = true" />

    <PluginStatusSegmented v-model:active-status="activeStatus" :filters="statusFilters" />

    <el-alert
      v-if="loadError"
      class="page-alert"
      :title="loadError"
      type="warning"
      show-icon
      :closable="false"
    />

    <el-alert
      v-if="actionMessage"
      class="page-alert"
      :title="actionMessage"
      type="success"
      show-icon
      :closable="false"
    />

    <section class="plugin-layout">
      <main class="plugin-primary-pane">
        <PluginList
          :plugins="filteredInstalled"
          :selected-plugin="selectedPlugin"
          :status-text="statusText"
          :is-toggle-locked="isPluginToggleLocked"
          @select="selectPlugin"
          @toggle="togglePlugin"
          @update="requestPluginUpdate"
        />
      </main>

      <PluginDetailPane
        :plugin="selectedPlugin"
        :status-text="statusText"
        :is-toggle-locked="isPluginToggleLocked"
        @toggle="togglePlugin"
        @open-config="openPluginConfig"
        @update="requestPluginUpdate"
        @delete="requestPluginDelete"
      />
    </section>

    <PluginUploadDialog
      v-model:visible="uploadDialogVisible"
      v-model:selected-file="selectedPluginFile"
      :upload-result="pluginUploadResult"
      :upload-error="pluginUploadError"
      :parsing="pluginUploadParsing"
      :installing="pluginUploadInstalling"
      v-model:replace="pluginUploadReplace"
      v-model:enable="pluginUploadEnable"
      @submit="submitPluginUpload"
      @confirm="confirmUploadedPlugin"
    />
  </div>
</template>

<script setup lang="ts">
import PluginDetailPane from './components/PluginDetailPane.vue'
import PluginList from './components/PluginList.vue'
import PluginStatusSegmented from './components/PluginStatusSegmented.vue'
import PluginToolbar from './components/PluginToolbar.vue'
import PluginUploadDialog from './components/PluginUploadDialog.vue'
import { usePluginsPage } from './Plugins'

const {
  keyword,
  activeStatus,
  uploadDialogVisible,
  selectedPluginFile,
  pluginUploadResult,
  pluginUploadError,
  pluginUploadParsing,
  pluginUploadInstalling,
  pluginUploadReplace,
  pluginUploadEnable,
  selectedPlugin,
  statusFilters,
  filteredInstalled,
  loadError,
  actionMessage,
  statusText,
  isPluginToggleLocked,
  selectPlugin,
  togglePlugin,
  requestPluginUpdate,
  requestPluginDelete,
  openPluginConfig,
  submitPluginUpload,
  confirmUploadedPlugin
} = usePluginsPage()
</script>

<style scoped src="./Plugins.css"></style>
