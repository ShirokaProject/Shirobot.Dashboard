import type { DirectoryEntry, DirectoryKind } from '../api/directory/directory'

export interface DirectoryOption {
  /** What is stored: instanceId:userId for users, the group ID for groups */
  value: string
  name: string
  /** ID and where it was seen, shown beside the name */
  detail: string
}

/** The stored form of a user, escaped like the host's UserReference.ToConfigString. */
export function userValue(instance: string, id: string) {
  return `${encodeURIComponent(instance)}:${encodeURIComponent(id)}`
}

/**
 * Options for a picker. Users are per instance (the same account on two instances is two choices);
 * a group seen by several instances is one choice, since group routing stores the bare group ID.
 */
export function directoryOptions(kind: DirectoryKind, entries: readonly DirectoryEntry[]): DirectoryOption[] {
  if (kind === 'users') {
    return entries.map(entry => ({
      value: userValue(entry.instance, entry.id),
      name: entry.name || entry.id,
      detail: `${entry.id} · ${entry.instance_name}`
    }))
  }

  const groups = new Map<string, { name: string; instances: string[] }>()
  for (const entry of entries) {
    const group = groups.get(entry.id) ?? { name: entry.name || entry.id, instances: [] }
    if (!group.instances.includes(entry.instance_name)) group.instances.push(entry.instance_name)
    groups.set(entry.id, group)
  }
  return [...groups].map(([id, group]) => ({ value: id, name: group.name, detail: `${id} · ${group.instances.join('、')}` }))
}

/** Pasted or typed values: split on commas and whitespace, trimmed, without blanks or repeats. */
export function normalizeDirectoryValues(values: readonly string[]) {
  return [...new Set(values.flatMap(value => value.split(/[,，\s]+/)).map(value => value.trim()).filter(Boolean))]
}
