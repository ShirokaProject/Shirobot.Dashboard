// Saved backend profiles, so one dashboard can log into several Shirobot instances.
// Names and addresses live in localStorage; a key is stored only when the user ticks
// "记住密钥" on that profile, otherwise it stays in the per-tab session (see session.ts).

export interface BackendProfile {
  id: string
  name: string
  /** Absolute origin such as http://10.0.0.5:8080, or '' for the same origin as the dashboard. */
  baseUrl: string
  /** Present only when the user chose to remember the key. */
  token?: string
  lastUsedAt?: number
}

const BACKENDS_STORAGE_KEY = 'shirobot.dashboard.backends'

export const DEFAULT_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * Switching between backends only makes sense when the dashboard is not bound to its own host.
 * Served same-origin with Shirobot (the default), there is exactly one backend: no switcher,
 * no "add backend", just the key prompt. Set VITE_ENABLE_BACKEND_SWITCH=true to opt back in.
 */
export const BACKEND_SWITCHING_ENABLED: boolean =
  Boolean(DEFAULT_BASE_URL) || import.meta.env.VITE_ENABLE_BACKEND_SWITCH === 'true'

function readProfiles(): BackendProfile[] {
  try {
    const raw = localStorage.getItem(BACKENDS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) as unknown : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is BackendProfile =>
      Boolean(item) && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.baseUrl === 'string'
      // A dashboard that is not bound to its host has no "same origin" backend to offer
      && (!BACKEND_SWITCHING_ENABLED || item.baseUrl !== '' || Boolean(DEFAULT_BASE_URL))
    )
  } catch {
    return []
  }
}

function writeProfiles(profiles: BackendProfile[]) {
  try {
    localStorage.setItem(BACKENDS_STORAGE_KEY, JSON.stringify(profiles))
  } catch {
    // Storage can be unavailable (private mode); profiles then last for this page only.
  }
}

/**
 * Saved profiles, most recently used first. Same-origin deployments always have the local
 * backend; a custom-backend dashboard starts empty until the user adds one.
 */
export function listBackends(): BackendProfile[] {
  const profiles = readProfiles()
  if (!profiles.length) {
    if (BACKEND_SWITCHING_ENABLED && !DEFAULT_BASE_URL) return []
    return [{ id: 'local', name: DEFAULT_BASE_URL ? '默认后端' : '本机', baseUrl: DEFAULT_BASE_URL }]
  }
  return profiles.sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
}

export function getBackend(id: string | undefined) {
  return listBackends().find(profile => profile.id === id)
}

export function normalizeBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
}

export function describeBaseUrl(baseUrl: string) {
  if (!baseUrl) return '同源'
  return baseUrl.replace(/^https?:\/\//i, '')
}

/** Insert or update a profile and mark it as the most recently used. */
export function saveBackend(profile: Omit<BackendProfile, 'id' | 'lastUsedAt'> & { id?: string }, remember: boolean) {
  const profiles = readProfiles().length ? readProfiles() : listBackends()
  const id = profile.id ?? `backend-${Date.now().toString(36)}`
  const next: BackendProfile = {
    id,
    name: profile.name.trim() || describeBaseUrl(profile.baseUrl),
    baseUrl: profile.baseUrl,
    token: remember && profile.token ? profile.token : undefined,
    lastUsedAt: Date.now()
  }
  writeProfiles([next, ...profiles.filter(item => item.id !== id)])
  return next
}

export function removeBackend(id: string) {
  writeProfiles(readProfiles().filter(profile => profile.id !== id))
}
