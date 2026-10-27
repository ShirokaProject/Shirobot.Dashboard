import { ElMessage } from 'element-plus'

/**
 * A failure the user must notice even when the inline status is out of view, such as a rejected save.
 * Stays until closed or 6 seconds pass; repeats of the same text are grouped.
 */
export function toastError(message: string) {
  ElMessage({ message, type: 'error', duration: 6000, showClose: true, grouping: true })
}
