<template>
  <div class="config-page">
    <!-- Same shape as the plugin config workspace: categories | editor (header, then rows) -->
    <nav class="page-nav panel" aria-label="配置分类">
      <button
        v-for="section in sections"
        :key="section.key"
        type="button"
        class="nav-pill"
        :class="{ selected: activeSection === section.key }"
        :aria-current="activeSection === section.key ? 'true' : undefined"
        @click="activeSection = section.key"
      >
        <MdIcon :name="section.icon" />
        <span>{{ section.label }}</span>
        <small>{{ section.count }}</small>
      </button>
      <p class="nav-foot">
        修改会写入主程序的配置文件，部分项需重启后生效。
        <a :href="DOCS_URL" target="_blank" rel="noreferrer">查看文档<MdIcon name="open_in_new" /></a>
      </p>
    </nav>

    <section class="page-editor panel">
      <header class="page-head">
        <span class="head-icon" aria-hidden="true"><MdIcon :name="currentSection.icon" /></span>
        <div class="head-title">
          <h2>{{ currentSection.label }}</h2>
          <p>{{ currentSection.description }}</p>
        </div>
        <span v-if="saveError" class="head-state error">{{ saveError }}</span>
        <span v-else-if="dirty" class="head-state"><span class="status-dot warning" aria-hidden="true"></span>有未保存的修改</span>
        <div class="button-group">
          <button type="button" class="md-button tonal" :disabled="!dirty || saving" @click="discard">放弃修改</button>
          <button type="button" class="md-button filled" :disabled="!dirty || saving" @click="save">保存</button>
        </div>
      </header>

      <div class="page-body">
        <div v-if="loadError" class="notice">
          <MdIcon name="error" class="notice-icon error" />
          <div>
            <strong>没有读到主程序配置</strong>
            <span>{{ loadError }}。下面显示的是默认值，保存会覆盖现有配置。</span>
          </div>
          <button type="button" class="md-button text compact" @click="loadConfig"><MdIcon name="refresh" />重试</button>
        </div>
        <p v-if="loading" class="page-note">正在读取配置…</p>

        <div v-else class="group-card">
          <!-- ---------- 基本 ---------- -->
          <template v-if="activeSection === 'general'">
            <div class="row">
              <div class="row-text">
                <label for="cfg-protocol">协议适配器</label>
                <p>启动时额外加载的适配器，可多选。在适配器页启用的适配器会自动加载，无需在此添加；未通过适配器页安装的可直接输入 DLL 名称或路径。<code>protocols</code></p>
              </div>
              <el-select
                id="cfg-protocol"
                v-model="form.protocols"
                class="control-select"
                multiple
                filterable
                allow-create
                default-first-option
                collapse-tags
                collapse-tags-tooltip
                placeholder="不额外加载"
              >
                <el-option v-for="protocol in protocols" :key="protocol.value" :label="protocol.label" :value="protocol.value" />
              </el-select>
            </div>
            <div class="row">
              <div class="row-text">
                <label for="cfg-log">启用日志</label>
                <p>关闭后只保留必要的运行日志。<code>enable_log</code></p>
              </div>
              <el-switch id="cfg-log" v-model="form.enable_log" />
            </div>
            <div class="row">
              <div class="row-text">
                <label for="cfg-console">禁用控制台输入</label>
                <p>开启后控制台不再接收交互命令，适合后台或容器运行。<code>disable_console_input</code></p>
              </div>
              <el-switch id="cfg-console" v-model="form.disable_console_input" />
            </div>
            <div class="row">
              <div class="row-text">
                <span class="row-label">桌面端主题</span>
                <p>Avalonia 桌面界面的配色，不影响 Dashboard。自动：18:00–6:00 使用深色，其余时间浅色。<code>avalonia_theme</code></p>
              </div>
              <div class="button-group" role="radiogroup" aria-label="桌面端主题">
                <button
                  v-for="theme in themeOptions"
                  :key="theme.value"
                  type="button"
                  role="radio"
                  class="md-button compact toggle"
                  :class="{ selected: form.avalonia_theme === theme.value }"
                  :aria-checked="form.avalonia_theme === theme.value"
                  @click="form.avalonia_theme = theme.value"
                >{{ theme.label }}</button>
              </div>
            </div>
          </template>

          <!-- ---------- 更新 ---------- -->
          <template v-else-if="activeSection === 'update'">
            <div class="row stacked">
              <div class="row-text">
                <label for="cfg-repo">主程序更新仓库</label>
                <p>检查和下载新版本的 GitHub 仓库，格式为 owner/repo。<code>host_update_repository</code></p>
              </div>
              <el-input id="cfg-repo" v-model="form.host_update_repository" placeholder="ShirokaProject/ShiroBot">
                <template #prefix><GitHubIcon /></template>
              </el-input>
            </div>
            <div class="row stacked">
              <div class="row-text">
                <label for="cfg-proxy">GitHub 代理地址</label>
                <p>下载插件、适配器和更新包时加在 GitHub 链接前的代理，留空表示直连。<code>github_proxy</code></p>
              </div>
              <el-input id="cfg-proxy" v-model="form.github_proxy" placeholder="https://gh-proxy.com/" clearable />
            </div>
          </template>

          <!-- ---------- 权限 ---------- -->
          <template v-else-if="activeSection === 'access'">
            <div class="row stacked">
              <div class="row-text">
                <label for="cfg-owners">所有者</label>
                <p>拥有全部权限的账号 ID，输入后按回车添加。<code>owner_list</code></p>
              </div>
              <el-input-tag
                id="cfg-owners"
                :model-value="form.owner_list"
                :delimiter="ID_DELIMITER"
                placeholder="输入账号 ID 后回车"
                @update:model-value="form.owner_list = onlyIds($event)"
              />
            </div>
            <div class="row stacked">
              <div class="row-text">
                <label for="cfg-admins">管理员</label>
                <p>可以使用管理命令的账号 ID。<code>admin_list</code></p>
              </div>
              <el-input-tag
                id="cfg-admins"
                :model-value="form.admin_list"
                :delimiter="ID_DELIMITER"
                placeholder="输入账号 ID 后回车"
                @update:model-value="form.admin_list = onlyIds($event)"
              />
            </div>
          </template>

          <!-- ---------- API ---------- -->
          <template v-else>
            <div class="row">
              <div class="row-text">
                <label for="cfg-api">启用 API</label>
                <p>Dashboard 通过它读取和管理主程序。<code>api.enable</code></p>
              </div>
              <el-switch id="cfg-api" v-model="form.api_enable" />
            </div>
            <div v-if="!form.api_enable" class="inline-warning">
              <MdIcon name="error" />保存后 Dashboard 将无法再连接到这个主程序，只能在本机修改配置文件恢复。
            </div>
            <div class="row stacked">
              <div class="row-text">
                <label for="cfg-listen">监听地址</label>
                <p>API 服务绑定的主地址。<code>api.listen_url</code></p>
              </div>
              <el-input id="cfg-listen" v-model="form.api_listen_url" placeholder="http://localhost:8080" />
            </div>
            <div class="row stacked">
              <div class="row-text">
                <label for="cfg-listens">额外监听地址</label>
                <p>需要同时监听的其他地址，每个地址回车添加。<code>api.listen_urls</code></p>
              </div>
              <el-input-tag id="cfg-listens" v-model="form.api_listen_urls" placeholder="例如 http://127.0.0.1:7001" />
            </div>
            <div class="row stacked">
              <div class="row-text">
                <label for="cfg-public">公开访问地址</label>
                <p>经反向代理或域名访问时，对外展示的基础 URL；留空则不设置。<code>api.public_base_url</code></p>
              </div>
              <el-input id="cfg-public" v-model="form.api_public_base_url" placeholder="https://bot.example.com" clearable />
            </div>
            <div class="row">
              <div class="row-text">
                <label for="cfg-auth">启用认证</label>
                <p>访问 API 时需要携带下面的令牌。<code>api.auth_enable</code></p>
              </div>
              <el-switch id="cfg-auth" v-model="form.api_auth_enable" />
            </div>
            <div v-if="form.api_enable && !form.api_auth_enable" class="inline-warning">
              <MdIcon name="error" />关闭认证后，任何能访问监听地址的人都可以管理主程序。
            </div>
            <div class="row stacked">
              <div class="row-text">
                <label for="cfg-token">访问令牌</label>
                <p>修改后需要用新令牌重新登录 Dashboard。<code>api.token</code></p>
              </div>
              <div class="token-field">
                <el-input id="cfg-token" v-model="form.api_token" placeholder="访问令牌" show-password />
                <button type="button" class="md-button tonal" @click="form.api_token = generateToken()">
                  <MdIcon name="refresh" />随机生成
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import GitHubIcon from '../../components/GitHubIcon.vue'
import MdIcon from '../../components/MdIcon.vue'
import { DOCS_URL } from '../../features/docs'
import { generateToken, isValidId, sections, themeOptions, useConfigPage } from './Config'

const {
  activeSection,
  currentSection,
  form,
  protocols,
  loading,
  saving,
  loadError,
  saveError,
  dirty,
  loadConfig,
  saveConfig,
  discard
} = useConfigPage()

// Pasting "123, 456 789" adds three tags
const ID_DELIMITER = /[,，\s]+/

function onlyIds(values: string[] | undefined) {
  const ids = (values ?? []).map(value => value.trim())
  if (ids.some(id => !isValidId(id))) ElMessage.warning('账号 ID 只能包含数字')
  return [...new Set(ids.filter(isValidId))]
}

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
