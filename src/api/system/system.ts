import { hostUpdateSnapshot } from '../../features/plugins/updateCounts'
import { isDemoMode } from '../../auth/session'
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
  const response = await withCurrentReleaseNotes(await apiRequest<HostUpdateCheck>('/api/v1/system/update'))
  hostUpdateSnapshot.value = response
  return response
}

// The host only returns notes for a newer release. When it is up to date, read the running version's release from
// the official repository instead, so the About page and the post-update dialog can show what this version changed.
const OFFICIAL_HOST_REPOSITORY = 'ShirokaProject/ShiroBot'
const currentNotesCache = new Map<string, { url: string | null; notes: string | null }>()

async function withCurrentReleaseNotes(check: HostUpdateCheck): Promise<HostUpdateCheck> {
  if (check.update_available || check.release_notes || !check.current_version || isDemoMode()) return check
  const version = check.current_version
  let release = currentNotesCache.get(version)
  if (!release) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${OFFICIAL_HOST_REPOSITORY}/releases/tags/v${encodeURIComponent(version)}`,
        { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(8000) })
      if (!response.ok) return check
      const body = await response.json() as { html_url?: unknown; body?: unknown }
      release = {
        url: typeof body.html_url === 'string' ? body.html_url : null,
        notes: typeof body.body === 'string' && body.body.trim() ? body.body : null
      }
      currentNotesCache.set(version, release)
    } catch {
      // Offline or rate limited: the check itself still stands
      return check
    }
  }
  return { ...check, release_url: check.release_url ?? release.url, release_notes: release.notes }
}

export function applyHostUpdate() {
  return apiRequest<HostPowerResponse & { restarting: boolean }>('/api/v1/system/update', { method: 'POST' })
}

export interface RestartNoticeResponse {
  recommended: boolean
  reasons: string[]
}

export function getRestartNotice(scope: 'plugin' | 'adapter', signal?: AbortSignal) {
  return apiRequest<RestartNoticeResponse>(`/api/v1/restart-notice?scope=${scope}`, { signal })
}
