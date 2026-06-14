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

    <section class="plugin-layout">
      <main class="plugin-primary-pane">
        <PluginList
          :plugins="filteredInstalled"
          :selected-plugin="selectedPlugin"
          :status-text="statusText"
          @select="selectPlugin"
          @toggle="togglePlugin"
        />
      </main>

      <PluginDetailPane
        :plugin="selectedPlugin"
        :status-text="statusText"
        @toggle="togglePlugin"
        @open-config="openPluginConfig"
      />
    </section>

    <PluginUploadDialog
      v-model:visible="uploadDialogVisible"
      v-model:selected-file="selectedPluginFile"
      @submit="submitPluginUpload"
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
  selectedPlugin,
  statusFilters,
  filteredInstalled,
  loadError,
  statusText,
  selectPlugin,
  togglePlugin,
  openPluginConfig,
  submitPluginUpload
} = usePluginsPage()
</script>

<style scoped src="./Plugins.css"></style>
