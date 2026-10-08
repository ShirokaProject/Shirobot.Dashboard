import { hostUpdateSnapshot } from '../../features/plugins/updateCounts'
import { apiRequest } from '../core/http'

export type HostPowerAction = 'restart' | 'shutdown'

export interface HostPowerResponse {
  ok: boolean
  message: string
}

export function requestHostPower(action: HostPowerAction) {
  return apiRequest<HostPowerResponse>(`/api/v1/system/${action}`, { method: 'POST' })
}

export interface HostUpdateCheck {
  current_version: string
  latest_version: string | null
  update_available: boolean
  asset_name: string
  release_url: string | null
  release_notes: string | null
  can_apply: boolean
  reason: string | null
}

export async function checkHostUpdate() {
  const response = await apiRequest<HostUpdateCheck>('/api/v1/system/update')
  hostUpdateSnapshot.value = response
  return response
}

export function applyHostUpdate() {
  return apiRequest<HostPowerResponse & { restarting: boolean }>('/api/v1/system/update', { method: 'POST' })
}
