<template>
  <div class="plugins-page">
    <section class="plugin-control-panel" aria-label="搜索和添加插件">
      <div class="control-primary-row">
        <PluginToolbar v-model:keyword="keyword" @upload="uploadDialogVisible = true" />
      </div>
    </section>

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
        <header class="plugin-list-heading">
          <div>
            <span class="section-kicker">已安装</span>
            <h2>插件库</h2>
          </div>
          <span class="result-count">显示 {{ filteredInstalled.length }} / {{ totalCount }}</span>
        </header>
        <div v-if="filteredInstalled.length" class="plugin-priority-sections">
          <section
            v-for="section in pluginSections"
            :key="section.key"
            class="plugin-priority-section"
            :class="section.key"
          >
            <header class="priority-section-heading">
              <span class="priority-section-icon"><MaterialSymbol :name="section.icon" /></span>
              <div class="priority-section-copy">
                <div class="priority-section-title">
                  <h3>{{ section.title }}</h3>
                  <strong>{{ section.plugins.length }}</strong>
                </div>
                <p>{{ section.description }}</p>
              </div>
            </header>
            <PluginList
              :plugins="section.plugins"
              :selected-plugin="detailVisible ? selectedPlugin : null"
              :status-text="statusText"
              :is-starred="isPluginStarred"
              :is-toggle-locked="isPluginToggleLocked"
              :is-toggle-pending="isPluginTogglePending"
              @select="selectPlugin"
              @toggle-star="togglePluginStar"
              @toggle="togglePlugin"
            />
          </section>
        </div>
        <div v-else class="empty-state">没有符合当前筛选条件的插件。</div>
      </main>
    </section>

    <el-dialog
      v-model="detailVisible"
      class="plugin-detail-dialog"
      :class="{ 'config-open': configPanelShifted }"
      modal-class="plugin-detail-overlay"
      :before-close="requestPluginDetailClose"
      :show-close="false"
      append-to-body
      align-center
      destroy-on-close
    >
      <PluginDetailPane
        :plugin="selectedPlugin"
        :status-text="statusText"
        :is-toggle-locked="isPluginToggleLocked"
        :is-toggle-pending="isPluginTogglePending"
        :actions="pluginActions"
        :actions-loading="pluginActionsLoading"
        :actions-error="pluginActionsError"
        :running-action-id="runningPluginActionId"
        :host-operation="hostOperation"
        :config-open="configPanelShifted"
        @close="requestPluginDetailClose"
        @toggle="togglePlugin"
        @open-config="openPluginConfig"
        @action="executePluginAction"
        @update="updatePlugin"
        @delete="deletePlugin"
      />
    </el-dialog>

    <Teleport to="body">
      <Transition
        name="config-panel"
        @after-leave="finishPluginConfigClose"
        @leave-cancelled="finishPluginConfigClose"
      >
        <div v-if="configPanelVisible && selectedPlugin" class="plugin-config-flyout">
          <PluginConfigPanel
            :key="selectedPlugin.id"
            embedded
            :plugin-id="selectedPlugin.id"
            :plugin-name="selectedPlugin.name"
            @close="closePluginConfig"
            @open-full="openPluginConfigPage(selectedPlugin)"
          />
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="plugin-snackbar">
        <div
          v-if="actionSnackbar"
          class="plugin-action-snackbar"
          :class="actionSnackbar.type"
          :role="actionSnackbar.type === 'error' ? 'alert' : 'status'"
          aria-live="polite"
        >
          <MaterialSymbol :name="actionSnackbar.type === 'error' ? 'logs' : 'check'" />
          <span>{{ actionSnackbar.message }}</span>
          <button type="button" aria-label="关闭提示" @click="dismissActionSnackbar">
            <MaterialSymbol name="close" />
          </button>
        </div>
      </Transition>
    </Teleport>

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
import MaterialSymbol from '../../components/MaterialSymbol.vue'
import PluginDetailPane from './components/PluginDetailPane.vue'
import PluginList from './components/PluginList.vue'
import PluginToolbar from './components/PluginToolbar.vue'
import PluginUploadDialog from './components/PluginUploadDialog.vue'
import PluginConfigPanel from '../pluginConfig/PluginConfig.vue'
import { usePluginsPage } from './Plugins'

const {
  keyword,
  totalCount,
  uploadDialogVisible,
  selectedPluginFile,
  pluginUploadResult,
  pluginUploadError,
  pluginUploadParsing,
  pluginUploadInstalling,
  pluginUploadReplace,
  pluginUploadEnable,
  selectedPlugin,
  detailVisible,
  configPanelVisible,
  configPanelShifted,
  filteredInstalled,
  pluginSections,
  loadError,
  actionSnackbar,
  pluginActions,
  pluginActionsLoading,
  pluginActionsError,
  runningPluginActionId,
  hostOperation,
  statusText,
  dismissActionSnackbar,
  isPluginStarred,
  togglePluginStar,
  isPluginToggleLocked,
  isPluginTogglePending,
  selectPlugin,
  togglePlugin,
  executePluginAction,
  updatePlugin,
  deletePlugin,
  openPluginConfig,
  closePluginConfig,
  finishPluginConfigClose,
  requestPluginDetailClose,
  openPluginConfigPage,
  submitPluginUpload,
  confirmUploadedPlugin
} = usePluginsPage()
</script>

<style scoped src="./Plugins.css"></style>
