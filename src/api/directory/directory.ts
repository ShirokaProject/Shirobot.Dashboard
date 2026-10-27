import { apiRequest } from '../core/http'

/** users: friends, stored as instanceId:userId; groups: group IDs. Matches the schema types "users" and "groups". */
export type DirectoryKind = 'users' | 'groups'

export interface DirectoryEntry {
  instance: string
  instance_name: string
  id: string
  name?: string | null
}

export interface DirectoryResponse {
  entries: DirectoryEntry[]
  /** Instances whose list could not be read (unsupported by the adapter, offline, timed out) */
  unavailable: Array<{ instance: string; instance_name: string; reason: string }>
}

export function getDirectory(kind: DirectoryKind, refresh = false) {
  return apiRequest<DirectoryResponse>(`/api/v1/directory/${kind}${refresh ? '?refresh=1' : ''}`)
}
