import { onMounted, onUnmounted, ref } from 'vue'

export function packageFileError(files: readonly File[], kind = '插件'): string | null {
  if (files.length !== 1) return `请一次上传一个${kind}文件。`
  const file = files[0]!
  if (!/\.(dll|zip)$/i.test(file.name)) return `请选择 .dll 或 .zip ${kind}文件。`
  if (file.size === 0) return `${kind}文件为空。`
  if (file.size > 100 * 1024 * 1024) return `${kind}文件不能超过 100 MB。`
  return null
}

export function packageFileDropHandlers(options: {
  busy: () => boolean
  hover: (active: boolean) => void
  drop: (files: File[]) => void
}) {
  let depth = 0
  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')
  const reset = () => { depth = 0; options.hover(false) }
  return {
    dragenter(event: DragEvent) {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth++
      if (!options.busy()) options.hover(true)
    },
    dragover(event: DragEvent) {
      if (!hasFiles(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = options.busy() ? 'none' : 'copy'
    },
    dragleave(event: DragEvent) {
      if (!hasFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (!depth) options.hover(false)
    },
    drop(event: DragEvent) {
      reset()
      if (!hasFiles(event)) return
      const alreadyHandled = event.defaultPrevented
      event.preventDefault()
      if (alreadyHandled || options.busy()) return
      options.drop(Array.from(event.dataTransfer?.files ?? []))
    },
    reset
  }
}

export function usePackageFileDrop(options: { busy: () => boolean; drop: (files: File[]) => void }) {
  const hovering = ref(false)
  const handlers = packageFileDropHandlers({ ...options, hover: active => { hovering.value = active } })
  onMounted(() => {
    window.addEventListener('dragenter', handlers.dragenter)
    window.addEventListener('dragover', handlers.dragover)
    window.addEventListener('dragleave', handlers.dragleave)
    window.addEventListener('drop', handlers.drop)
    // Upload widgets handle and stop their own drops; still clear the page hint.
    window.addEventListener('drop', handlers.reset, true)
    window.addEventListener('blur', handlers.reset)
  })
  onUnmounted(() => {
    window.removeEventListener('dragenter', handlers.dragenter)
    window.removeEventListener('dragover', handlers.dragover)
    window.removeEventListener('dragleave', handlers.dragleave)
    window.removeEventListener('drop', handlers.drop)
    window.removeEventListener('drop', handlers.reset, true)
    window.removeEventListener('blur', handlers.reset)
  })
  return hovering
}
