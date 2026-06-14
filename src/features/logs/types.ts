export type LogKind = 'message' | 'plugin' | 'system'
export type LogLevel = 'INFO' | 'WARN' | 'ERROR'
export type KindFilter = 'ALL' | LogKind

export type RuntimeLog = {
  id: number
  kind: LogKind
  level: LogLevel
  time: string
  source: string
  message: string
  raw: string
  traceId: string
  groupName?: string
  groupId?: string
  userId?: string
}

export type LogSourceFilter = {
  key: string
  label: string
  short: string
  description: string
  count: number
}
