export function normalizeRestartNotice(response: { recommended?: boolean; reasons?: unknown } | null) {
  if (response?.recommended !== true) return { recommended: false, reasons: [] as string[] }
  const reasons = Array.isArray(response.reasons)
    ? [...new Set(response.reasons.filter((reason): reason is string => typeof reason === 'string').map(reason => reason.trim()).filter(Boolean))].slice(0, 20)
    : []
  if (reasons.length === 0) reasons.push('有插件资源未完全释放，建议重启宿主完成清理。')
  return { recommended: true, reasons }
}
