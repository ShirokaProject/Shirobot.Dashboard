import { ElMessage, ElMessageBox } from 'element-plus'
import { getApiErrorMessage, requestHostPower } from '../../api'

/** Offer a restart only after the user confirms; declining keeps the host running. */
export async function offerHostRestart(message: string, title = '建议重启宿主') {
  try {
    await ElMessageBox.confirm(
      `${message}\n\n要现在重启宿主吗？`,
      title,
      { confirmButtonText: '现在重启', cancelButtonText: '稍后重启', type: 'warning', closeOnClickModal: false }
    )
  } catch {
    return
  }

  try {
    const result = await requestHostPower('restart')
    ElMessage.success(result.message || '宿主正在重启')
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error, '重启宿主失败'))
  }
}

export function offerRestartForStagedUpdate(message: string, title = '新版本将在重启后生效') {
  return offerHostRestart(message, title)
}
