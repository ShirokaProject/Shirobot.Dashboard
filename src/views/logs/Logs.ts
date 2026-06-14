import { computed, ref, watch } from 'vue'
import { getRuntimeLogs } from '../../api'
import type { KindFilter, RuntimeLog } from '../../features/logs/types'
import { createSourceFilters, kindLabel, kindOptions } from '../../features/logs/utils'

export function useLogsPage() {
  const keyword = ref('')
  const activeKind = ref<KindFilter>('ALL')
  const activeSource = ref('ALL')
  const autoRefresh = ref(true)
  const loadError = ref('')

  const runtimeLogs = ref<RuntimeLog[]>([])
  const selectedLog = ref<RuntimeLog | null>(null)
  const normalizedKeyword = computed(() => keyword.value.trim().toLowerCase())

  const filteredLogs = computed(() => {
    return runtimeLogs.value.filter(log => {
      const matchKind = activeKind.value === 'ALL' || log.kind === activeKind.value
      const matchSource = activeSource.value === 'ALL' || log.source === activeSource.value
      const matchKeyword = !normalizedKeyword.value || [log.raw, log.message, log.source, log.traceId, log.groupName ?? '', log.groupId ?? '', log.userId ?? '']
        .some(value => value.toLowerCase().includes(normalizedKeyword.value))
      return matchKind && matchSource && matchKeyword
    })
  })

  const sourceFilters = computed(() => createSourceFilters(runtimeLogs.value))

  watch(filteredLogs, logs => {
    if (!selectedLog.value || !logs.some(log => log.id === selectedLog.value?.id)) {
      selectedLog.value = logs[0] ?? null
    }
  })

  function setKind(kind: KindFilter) {
    activeKind.value = kind
  }

  async function refreshLogs() {
    loadError.value = ''
    try {
      const response = await getRuntimeLogs({
        source: activeSource.value,
        kind: activeKind.value,
        limit: 200
      })
      runtimeLogs.value = response.logs
    } catch (error) {
      runtimeLogs.value = []
      loadError.value = '后端运行日志接口暂不可用，请接入 /api/v1/runtime/logs 后刷新。'
      void error
    }
  }

  void refreshLogs()

  return {
    keyword,
    activeKind,
    activeSource,
    autoRefresh,
    loadError,
    selectedLog,
    filteredLogs,
    sourceFilters,
    kindOptions,
    kindLabel,
    setKind,
    refreshLogs
  }
}
