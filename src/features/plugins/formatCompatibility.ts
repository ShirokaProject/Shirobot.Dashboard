export function formatContractCompatibility(value: {
  shirobot?: string
  framework?: string
  platforms?: string[]
  status?: string
  api?: { minimum: string; testedThrough: string } | null
  abi?: Record<string, string>
}) {
  const parts: string[] = []
  for (const [name, version] of Object.entries(value.abi ?? {})) {
    parts.push(`${name.replace(/^ShiroBot\./, '')} ABI ${version}`)
  }
  if (!parts.length) {
    if (value.status) parts.push('ABI 未知')
    else if (value.shirobot && value.shirobot !== 'unknown') parts.push(`目录声明 ${value.shirobot}`)
  }
  if (value.framework && value.framework !== 'unknown') parts.push(value.framework)
  if (value.platforms?.length) parts.push(value.platforms.join(', '))
  return parts.join(' · ') || '—'
}

/**
 * SPDX placeholders from GitHub's license detection read as Chinese: NOASSERTION means a license file
 * exists but was not recognized, NONE that there is none.
 */
export function formatLicense(license?: string | null) {
  const value = license?.trim() ?? ''
  if (/^noassertion$/i.test(value)) return '未识别'
  if (/^none$/i.test(value)) return '无'
  return value
}

/** Return a reason for ABI rejection; product/release versions are deliberately not used. */
export function contractAbiRejection(required: Record<string, string> | undefined, host: Record<string, string> | null): string {
  for (const [rawName, version] of Object.entries(required ?? {})) {
    const name = rawName.startsWith('ShiroBot.') ? rawName : `ShiroBot.${rawName}`
    if (!host) return '无法确认宿主 ABI，请更新宿主或稍后重试'
    const installed = host[name]
    if (!installed) return `宿主缺少 ${name} 契约`
    const parse = (value: string) => /^\d+(?:\.\d+){1,3}$/.test(value) ? value.split('.').map(Number) : null
    const wanted = parse(version), current = parse(installed)
    if (!wanted || !current) return `${name} ABI 信息无效，无法确认兼容性`
    const newer = [0, 1, 2, 3].map(i => (wanted[i] ?? 0) - (current[i] ?? 0)).find(delta => delta !== 0) ?? 0
    if (wanted[0] !== current[0] || newer > 0) return `需要 ${name} ABI ${version}，当前宿主为 ${installed}`
  }
  return ''
}
