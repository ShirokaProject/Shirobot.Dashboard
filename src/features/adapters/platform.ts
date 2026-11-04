const PLATFORM_LABELS: Record<string, string> = {
  qq: 'QQ',
  tg: 'Telegram',
  telegram: 'Telegram',
  wechat: '微信',
  wx: '微信',
  discord: 'Discord',
  kook: 'KOOK',
  onebot: 'OneBot',
  github: 'GitHub',
  slack: 'Slack',
  line: 'LINE',
  dingtalk: '钉钉',
  feishu: '飞书',
  lark: '飞书',
}

/** Platform ids arrive lowercase ("qq", "telegram"); show them with their proper brand casing. */
export function formatPlatform(value: string): string {
  const key = value.trim().toLowerCase()
  return PLATFORM_LABELS[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : value)
}

/**
 * The chat platform an adapter serves, from the ShiroBot.Model.* it is built on ("QQ" for Milky and the QQ
 * official bot alike). The adapter's own platform field is usually its protocol, so it is only the fallback
 * when no Model is known.
 */
export function formatAdapterPlatform(platform: string, models: readonly string[]): string {
  const families = [...new Set(models.map(formatPlatform))].filter(Boolean)
  if (families.length) return families.join(' / ')
  return platform.trim() ? formatPlatform(platform) : '未声明'
}

/** Model names from ABI requirement keys such as "ShiroBot.Model.QQ" or "Model.QQ". */
export function modelsFromAbi(abi: Record<string, unknown>): string[] {
  return Object.keys(abi).map(name => /(?:^|\.)Model\.([^.\s]+)$/.exec(name)?.[1]).filter((name): name is string => Boolean(name))
}
