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
 * "QQ · Milky": the chat platform, from the ShiroBot.Model.* the adapter is built on, then the adapter's own
 * platform (usually its protocol). Telegram and Discord adapters read the same way, so they tell apart at a glance.
 */
export function formatAdapterPlatform(platform: string, models: readonly string[]): string {
  const own = platform.trim() ? formatPlatform(platform) : ''
  const families = [...new Set(models.map(formatPlatform))].filter(family => family.toLowerCase() !== own.toLowerCase())
  return [families.join(' / '), own].filter(Boolean).join(' · ') || '未声明'
}

/** Model names from ABI requirement keys such as "ShiroBot.Model.QQ" or "Model.QQ". */
export function modelsFromAbi(abi: Record<string, unknown>): string[] {
  return Object.keys(abi).map(name => /(?:^|\.)Model\.([^.\s]+)$/.exec(name)?.[1]).filter((name): name is string => Boolean(name))
}
