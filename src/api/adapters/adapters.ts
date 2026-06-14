import { apiRequest } from '../core/http'

export interface AdapterInfo {
  type: string
  account: string
  connected: boolean
  events: number
}

export function getAdapters() {
  return apiRequest<AdapterInfo[]>('/api/adapters')
}
