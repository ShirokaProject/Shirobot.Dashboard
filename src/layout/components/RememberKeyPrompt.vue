<template>
  <Transition name="remember-prompt">
    <section v-if="backendId" class="remember-prompt" role="status" aria-live="polite">
      <el-icon class="prompt-icon" aria-hidden="true"><Key /></el-icon>
      <div class="prompt-copy">
        <strong>已通过链接登录</strong>
        <span>在这台设备上记住密钥？下次打开无需再输入。</span>
      </div>
      <div class="prompt-actions">
        <button type="button" class="prompt-button" @click="dismiss">不用</button>
        <button type="button" class="prompt-button primary" @click="remember">记住</button>
      </div>
    </section>
  </Transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Key } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { consumeRememberOffer, rememberSessionKey } from '../../auth/signIn'

// Shown once after a `?token=` link sign-in that did not already have a remembered key
const backendId = ref<string | null>(null)
let showTimer: number | undefined
let hideTimer: number | undefined

onMounted(() => {
  const id = consumeRememberOffer()
  if (!id) return
  // Let the entrance animation finish first
  showTimer = window.setTimeout(() => {
    backendId.value = id
    hideTimer = window.setTimeout(dismiss, 15000)
  }, 600)
})

onBeforeUnmount(() => {
  window.clearTimeout(showTimer)
  window.clearTimeout(hideTimer)
})

function dismiss() {
  window.clearTimeout(hideTimer)
  backendId.value = null
}

function remember() {
  const id = backendId.value
  dismiss()
  if (id && rememberSessionKey(id)) ElMessage.success('已记住密钥')
}
</script>

<style scoped>
.remember-prompt {
  position: fixed;
  z-index: 60;
  bottom: var(--md-space-6);
  left: 50%;
  width: min(520px, calc(100vw - 2 * var(--md-space-4)));
  display: flex;
  align-items: center;
  gap: var(--md-space-3);
  padding: var(--md-space-3) var(--md-space-3) var(--md-space-3) var(--md-space-4);
  border-radius: var(--md-sys-shape-corner-large);
  background: var(--md-sys-color-inverse-surface);
  color: var(--md-sys-color-inverse-on-surface);
  box-shadow: var(--md-sys-elevation-level3);
  box-sizing: border-box;
  transform: translateX(-50%);
}

.prompt-icon {
  flex: 0 0 auto;
  font-size: 20px;
}

.prompt-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.prompt-copy strong {
  font: var(--md-sys-typescale-label-large);
}

.prompt-copy span {
  font: var(--md-sys-typescale-body-small);
  opacity: 0.8;
}

.prompt-actions {
  flex: 0 0 auto;
  display: flex;
  gap: var(--md-space-1);
}

.prompt-button {
  height: 36px;
  padding: 0 var(--md-space-3);
  border: 0;
  border-radius: var(--md-sys-shape-corner-full);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: var(--md-sys-typescale-label-large);
}

/* Filled so it reads as the main action in every theme; 纸墨's inverse-primary is grey and looked disabled */
.prompt-button.primary {
  padding: 0 var(--md-space-4);
  background: var(--md-sys-color-inverse-on-surface);
  color: var(--md-sys-color-inverse-surface);
  font-weight: 600;
}

.prompt-button:hover {
  opacity: 0.8;
}

.remember-prompt-enter-active,
.remember-prompt-leave-active {
  transition:
    opacity var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard),
    transform var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-emphasized-decelerate);
}

.remember-prompt-enter-from,
.remember-prompt-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

/* Phones: sit above the floating navigation bar */
@media (max-width: 599px) {
  .remember-prompt {
    bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    flex-wrap: wrap;
  }

  .prompt-copy {
    flex-basis: calc(100% - 32px);
  }

  .prompt-actions {
    margin-left: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .remember-prompt-enter-active,
  .remember-prompt-leave-active {
    transition: opacity var(--md-sys-motion-duration-short3) linear;
  }

  .remember-prompt-enter-from,
  .remember-prompt-leave-to {
    transform: translateX(-50%);
  }
}
</style>
