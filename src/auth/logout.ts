import { ElMessageBox } from 'element-plus'
import type { Router } from 'vue-router'
import { clearDashboardSession } from './session'

/** Ask first, then end the session and go back to the login page. Returns whether it logged out. */
export async function confirmLogout(router: Router) {
  try {
    await ElMessageBox.confirm('退出后需要重新输入登录密钥才能再次进入。', '确定要退出登录吗？', {
      confirmButtonText: '退出登录',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    })
  } catch {
    return false
  }
  clearDashboardSession()
  await router.replace('/login')
  return true
}
