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
      :type="actionMessageType"
      show-icon
      closable
      @close="actionMessage = ''"
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
        />
      </main>

      <PluginDetailPane
        :plugin="selectedPlugin"
        :status-text="statusText"
        :is-toggle-locked="isPluginToggleLocked"
        :actions="pluginActions"
        :actions-loading="pluginActionsLoading"
        :actions-error="pluginActionsError"
        :running-action-id="runningPluginActionId"
        :host-operation="hostOperation"
        @toggle="togglePlugin"
        @open-config="openPluginConfig"
        @action="executePluginAction"
        @update="updatePlugin"
        @delete="deletePlugin"
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
  actionMessageType,
  pluginActions,
  pluginActionsLoading,
  pluginActionsError,
  runningPluginActionId,
  hostOperation,
  statusText,
  isPluginToggleLocked,
  selectPlugin,
  togglePlugin,
  executePluginAction,
  updatePlugin,
  deletePlugin,
  openPluginConfig,
  submitPluginUpload,
  confirmUploadedPlugin
} = usePluginsPage()
</script>

<style scoped src="./Plugins.css"></style>
