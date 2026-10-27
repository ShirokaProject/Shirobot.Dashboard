export class ApiError extends Error {
  readonly status: number
  readonly body?: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

// Codes some older hosts send without a readable message.
const errorCodeMessages: Record<string, string> = {
  adapter_not_found: '未找到该适配器',
  upload_not_found: '上传的适配器包已过期或不存在，请重新上传',
  invalid_repository: '仓库地址无效，请填写 owner/repo 或 GitHub 仓库链接',
  release_not_found: '该仓库没有可安装的 Release'
}

/**
 * The host's reason for a failed request, for showing to the user. Never the bare HTTP status text
 * ("Bad Request"): without a reason it is the fallback with the status code.
 */
export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const body = error.body
    // A plain-text reason, but not an HTML error page from a proxy.
    if (typeof body === 'string' && body.trim() && !/^\s*</.test(body)) return body.trim()
    if (body && typeof body === 'object') {
      const { message, msg, error: code } = body as { message?: unknown; msg?: unknown; error?: unknown }
      for (const text of [message, msg]) if (typeof text === 'string' && text.trim()) return text.trim()
      if (typeof code === 'string' && errorCodeMessages[code]) return errorCodeMessages[code]
    }
    return `${fallback}（HTTP ${error.status}）`
  }

  // fetch rejects with a TypeError when the host is unreachable.
  if (error instanceof TypeError) return `${fallback}：无法连接宿主，请确认 ShiroBot 正在运行`
  if (error instanceof Error && error.message.trim()) return error.message
  return fallback
}
