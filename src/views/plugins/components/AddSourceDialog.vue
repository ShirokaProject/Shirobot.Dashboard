<template>
  <el-dialog
    :model-value="visible"
    :title="`添加${noun}源`"
    width="480px"
    append-to-body
    align-center
    @update:model-value="emit('update:visible', $event)"
  >
    <form class="add-form" @submit.prevent="submit">
      <div class="button-group type-toggle" role="radiogroup" aria-label="源类型">
        <button
          type="button"
          role="radio"
          class="md-button compact toggle"
          :class="{ selected: type === 'repo' }"
          :aria-checked="type === 'repo'"
          @click="type = 'repo'"
        >单个{{ noun }}仓库</button>
        <button
          type="button"
          role="radio"
          class="md-button compact toggle"
          :class="{ selected: type === 'catalog' }"
          :aria-checked="type === 'catalog'"
          @click="type = 'catalog'"
        >{{ noun }}目录</button>
      </div>

      <p class="type-hint">
        {{ type === 'repo'
          ? `直接添加一个${noun}仓库，不需要收录进官方目录。支持 GitHub、Gitea 等 Git 服务。`
          : `添加一个列出多个${noun}的目录仓库，例如第三方维护的合集。` }}
      </p>

      <label class="text-field">
        <span>{{ type === 'repo' ? '仓库地址' : '目录地址' }}</span>
        <input
          v-model="address"
          type="text"
          :placeholder="type === 'repo' ? 'https://git.example.com/owner/repo 或 owner/repo' : 'owner/repo 或 https://…/catalog.json'"
          autocomplete="off"
          @input="error = ''"
        />
      </label>

      <!-- Live recognition so the user sees what will be added before submitting -->
      <div v-if="type === 'repo' && address.trim()" class="recognized" :class="{ invalid: !parsed }">
        <template v-if="parsed">
          <GitHubIcon v-if="parsed.host === 'github'" />
          <SiteIcon v-else :domain="parsed.domain" />
          <span><strong>{{ repoHostLabel(parsed) }}</strong> · {{ parsed.owner }}/{{ parsed.repo }}</span>
        </template>
        <template v-else>
          <MdIcon name="error" />
          <span>无法识别为仓库地址</span>
        </template>
      </div>

      <label v-if="type === 'catalog'" class="text-field">
        <span>名称 <small>可选</small></span>
        <input v-model="name" type="text" placeholder="例如：社区源" autocomplete="off" />
      </label>

      <p v-if="error" class="form-error">{{ error }}</p>

      <div class="rules">
        <MdIcon name="error" />
        <div v-if="type === 'repo'">
          仓库需要符合 <strong>Shirobot Release 规则</strong>：最新 Release 附带{{ noun }}包，并提供 sha256 校验。不符合时仍会列出，但无法安装。
          <a class="doc-link" :href="DOCS_URL" target="_blank" rel="noopener noreferrer">查看官方文档<MdIcon name="open_in_new" /></a>
        </div>
        <div v-else>第三方目录里的{{ noun }}未经官方审核，只添加你信任的来源。</div>
      </div>
    </form>

    <template #footer>
      <div class="button-group dialog-actions">
        <button type="button" class="md-button tonal" @click="emit('update:visible', false)">取消</button>
        <button type="button" class="md-button filled" @click="submit">添加</button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import GitHubIcon from '../../../components/GitHubIcon.vue'
import MdIcon from '../../../components/MdIcon.vue'
import SiteIcon from '../../../components/SiteIcon.vue'
import { DOCS_URL } from '../../../features/docs'
import {
  isValidCatalogUrl,
  normalizeCatalogUrl,
  parseRepository,
  repoHostLabel,
  type ParsedRepository,
  type SourceType
} from '../../../features/plugins/catalogSources'

const props = withDefaults(defineProps<{ visible: boolean; initialType: SourceType; noun?: string }>(), { noun: '插件' })

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  addRepo: [repo: ParsedRepository]
  addCatalog: [name: string, url: string]
}>()

const type = ref<SourceType>(props.initialType)
const address = ref('')
const name = ref('')
const error = ref('')

const parsed = computed(() => parseRepository(address.value))

watch(() => props.visible, open => {
  if (!open) return
  type.value = props.initialType
  address.value = ''
  name.value = ''
  error.value = ''
})

function submit() {
  if (type.value === 'repo') {
    if (!parsed.value) {
      error.value = '请填写仓库地址，例如 https://github.com/owner/repo。'
      return
    }
    emit('addRepo', parsed.value)
  } else {
    const url = normalizeCatalogUrl(address.value)
    if (!isValidCatalogUrl(url)) {
      error.value = '请填写 owner/repo，或以 https:// 开头的目录地址。'
      return
    }
    emit('addCatalog', name.value, url)
  }
  emit('update:visible', false)
}
</script>

<style scoped>
.add-form {
  display: flex;
  flex-direction: column;
  gap: var(--md-space-4);
}

.type-toggle {
  align-self: flex-start;
}

.type-hint {
  margin: calc(var(--md-space-2) * -1) 0 0;
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.text-field {
  display: flex;
  flex-direction: column;
  gap: var(--md-space-2);
}

.text-field > span {
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-label-large);
}

.text-field small {
  color: var(--md-sys-color-outline);
  font: var(--md-sys-typescale-body-small);
}

.text-field input {
  height: 48px;
  padding: 0 var(--md-space-4);
  border: 1px solid var(--md-sys-color-outline);
  border-radius: var(--md-sys-shape-corner-extra-small);
  outline: 0;
  background: transparent;
  color: var(--md-sys-color-on-surface);
  font: var(--md-sys-typescale-body-large);
}

.text-field input:focus {
  border-color: var(--md-sys-color-primary);
  box-shadow: inset 0 0 0 1px var(--md-sys-color-primary);
}

.recognized {
  display: flex;
  align-items: center;
  gap: var(--md-space-2);
  margin-top: calc(var(--md-space-2) * -1);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.recognized strong {
  color: var(--md-sys-color-on-surface);
}

.recognized .github-mark,
.recognized .site-icon,
.recognized .md-icon {
  font-size: 16px;
}

.recognized.invalid {
  color: var(--md-sys-color-error);
}

.form-error {
  margin: 0;
  color: var(--md-sys-color-error);
  font: var(--md-sys-typescale-body-small);
}

.rules {
  display: flex;
  align-items: flex-start;
  gap: var(--md-space-2);
  padding: var(--md-space-3);
  border-radius: var(--md-sys-shape-corner-medium);
  background: var(--app-inset);
  color: var(--md-sys-color-on-surface-variant);
  font: var(--md-sys-typescale-body-small);
}

.rules .md-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--md-sys-color-warning);
  font-size: 16px;
}

.rules strong {
  color: var(--md-sys-color-on-surface);
}

.doc-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: var(--md-space-1);
  color: var(--app-accent);
  font-weight: 500;
  text-decoration: none;
}

.doc-link:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.rules .doc-link .md-icon {
  margin: 0;
  color: inherit;
  font-size: 14px;
}

.dialog-actions {
  width: 100%;
  justify-content: flex-end;
}
</style>
