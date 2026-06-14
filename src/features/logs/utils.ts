import type { LogKind, LogSourceFilter, RuntimeLog } from './types'

export const kindOptions: Array<{ label: string; value: 'ALL' | LogKind }> = [
  { label: '全部', value: 'ALL' },
  { label: '消息', value: 'message' },
  { label: '插件', value: 'plugin' },
  { label: '系统', value: 'system' }
]

export function kindLabel(kind: LogKind) {
  return {
    message: '消息',
    plugin: '插件',
    system: '系统'
  }[kind]
}

export function lastOutput(logs: RuntimeLog[], source: string) {
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const log = logs[index]
    if (log.source === source) return log.message
  }
  return '暂无输出'
}

export function createSourceFilters(logs: RuntimeLog[]): LogSourceFilter[] {
  const sources = [...new Set(logs.map(log => log.source))]
  return [
    {
      key: 'ALL',
      label: '全部来源',
      short: '*',
      description: '消息、插件、系统输出',
      count: logs.length
    },
    ...sources.map(source => ({
      key: source,
      label: source,
      short: source.slice(0, 2).toUpperCase(),
      description: lastOutput(logs, source),
      count: logs.filter(log => log.source === source).length
    }))
  ]
}
