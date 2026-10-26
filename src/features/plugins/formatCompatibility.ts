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
