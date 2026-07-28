import { apiRequest } from '../core/http'

export interface AdapterInfo {
  type: string
  account: string
  connected: boolean
  events: number
}

export function getAdapters() {
  return apiRequest<{
    adapter: string
    adapter_status?: 'connected' | 'disconnected' | 'unknown'
    message_count: number
  }>('/api/v1/overview').then(response => [{
    type: response.adapter || 'Unknown',
    account: '运行时当前适配器',
    connected: response.adapter_status === 'connected',
    events: response.message_count ?? 0
  }])
}
