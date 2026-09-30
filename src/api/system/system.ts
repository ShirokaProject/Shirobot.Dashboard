import { apiRequest } from '../core/http'

export type HostPowerAction = 'restart' | 'shutdown'

export interface HostPowerResponse {
  ok: boolean
  message: string
}

// Backend contract is not final yet; the dashboard only needs ok + message.
export function requestHostPower(action: HostPowerAction) {
  return apiRequest<HostPowerResponse>(`/api/v1/system/${action}`, { method: 'POST' })
}
