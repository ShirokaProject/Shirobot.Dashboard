<template>
  <div class="config-page">
    <nav class="page-nav panel" aria-label="配置分类">
      <button
        v-for="group in groups"
        :key="group.key"
        type="button"
        class="nav-pill"
        :class="{ selected: activeGroup === group.key }"
        :aria-current="activeGroup === group.key ? 'true' : undefined"
        @click="activeGroup = group.key"
      >
        <MdIcon :name="group.icon" />
        <span>{{ group.label }}</span>
        <small>{{ group.fields.length }}</small>
      </button>
      <p class="nav-foot">
        配置项和分类由主程序提供，保存后写入主程序配置文件。
        <a :href="DOCS_URL" target="_blank" rel="noreferrer">查看文档<MdIcon name="open_in_new" /></a>
      </p>
    </nav>

    <section class="page-editor panel">
      <header class="page-head">
        <span class="head-icon" aria-hidden="true"><MdIcon :name="currentGroup?.icon ?? ''" /></span>
        <div class="head-title">
          <h2>{{ currentGroup?.label ?? '主程序配置' }}</h2>
          <p>{{ currentGroup?.description ?? '配置字段由主程序 Schema 描述。' }}</p>
        </div>
        <span v-if="saveError" class="head-state error">{{ saveError }}</span>
        <span v-else-if="dirty" class="head-state"><span class="status-dot warning" aria-hidden="true"></span>有未保存的修改</span>
        <div class="button-group">
          <button type="button" class="md-button tonal" :disabled="!dirty || saving || loading || !!loadError" @click="discard">放弃修改</button>
          <button type="button" class="md-button filled" :disabled="!dirty || saving || loading || !!loadError" @click="save">保存</button>
        </div>
      </header>

      <div class="page-body">
        <div v-if="loadError" class="notice">
          <MdIcon name="error" class="notice-icon error" />
          <div>
            <strong>没有读到主程序配置</strong>
            <span>{{ loadError }}</span>
          </div>
          <button type="button" class="md-button text compact" @click="loadConfig"><MdIcon name="refresh" />重试</button>
        </div>
        <div v-if="loadWarning" class="notice">
          <MdIcon name="error" class="notice-icon" />
          <div>
            <strong>配置包含空值</strong>
            <span>{{ loadWarning }}</span>
          </div>
        </div>
        <p v-if="loading" class="page-note">正在读取配置…</p>
        <div v-else-if="currentGroup" class="group-card">
          <ConfigFieldRow
            v-for="field in currentGroup.fields"
            :key="field.path"
            :field="field"
            :id-prefix="field.path"
            :model-value="fieldValue(field.path) as PluginConfigValue | undefined"
            @update:model-value="setFieldValue(field.path, $event)"
          />
        </div>
        <p v-else class="page-note">后端没有提供可编辑的配置字段。</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MdIcon from '../../components/MdIcon.vue'
import { DOCS_URL } from '../../features/docs'
import type { PluginConfigValue } from '../../api'
import ConfigFieldRow from '../pluginConfig/components/ConfigFieldRow.vue'
import { useConfigPage } from './Config'

const {
  activeGroup,
  currentGroup,
  groups,
  loading,
  saving,
  loadError,
  loadWarning,
  saveError,
  dirty,
  loadConfig,
  saveConfig,
  discard,
  setFieldValue,
  fieldValue
} = useConfigPage()

async function save() {
  if (await saveConfig()) ElMessage.success('配置已保存')
}

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm('修改还没有保存，离开后会丢失。', '放弃修改？', {
      confirmButtonText: '放弃修改',
      cancelButtonText: '继续编辑',
      confirmButtonClass: 'el-button--danger'
    })
    return true
  } catch {
    return false
  }
})
</script>

<style scoped src="./Config.css"></style>
