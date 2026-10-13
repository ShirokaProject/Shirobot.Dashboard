export function formatContractCompatibility(value: {
  shirobot?: string
  framework?: string
  platforms?: string[]
  status?: string
  api?: { minimum: string; testedThrough: string } | null
  abi?: Record<string, string>
}) {
  const parts: string[] = []
  if (value.status) {
    if (value.status === 'unknown') parts.push('兼容性未知')
    if (value.api) parts.push(`API ≥${value.api.minimum}（已测试 ${value.api.testedThrough}）`)
    for (const [name, version] of Object.entries(value.abi ?? {})) {
      parts.push(`${name.replace(/^ShiroBot\./, '')} ABI ${version}`)
    }
  } else if (value.shirobot && value.shirobot !== 'unknown') {
    parts.push(`目录声明 ${value.shirobot}`)
  }
  if (value.framework && value.framework !== 'unknown') parts.push(value.framework)
  if (value.platforms?.length) parts.push(value.platforms.join(', '))
  return parts.join(' · ') || '—'
}
