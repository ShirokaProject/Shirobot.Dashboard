import type { DirectoryEntry, DirectoryKind } from '../api/directory/directory'

export interface DirectoryOption {
  /** What is stored: instanceId:userId for users, the group ID for groups */
  value: string
  name: string
  id: string
  /** Where it was seen; empty when there is only one instance, so it would tell nothing */
  instances: string
  /** Shown on the selected tag and searched: the name with the number, as names repeat */
  label: string
}

/** The stored form of a user, escaped like the host's UserReference.ToConfigString. */
export function userValue(instance: string, id: string) {
  return `${encodeURIComponent(instance)}:${encodeURIComponent(id)}`
}

function option(value: string, name: string | null | undefined, id: string, instances: string): DirectoryOption {
  const shown = name?.trim() || id
  return { value, name: shown, id, instances, label: shown === id ? id : `${shown} · ${id}` }
}

/**
 * Options for a picker. Users are per instance (the same account on two instances is two choices);
 * a group seen by several instances is one choice, since group routing stores the bare group ID.
 */
export function directoryOptions(kind: DirectoryKind, entries: readonly DirectoryEntry[]): DirectoryOption[] {
  const several = new Set(entries.map(entry => entry.instance)).size > 1
  if (kind === 'users') {
    return entries.map(entry => option(userValue(entry.instance, entry.id), entry.name, entry.id, several ? entry.instance_name : ''))
  }

  const groups = new Map<string, { name?: string | null; instances: string[] }>()
  for (const entry of entries) {
    const group = groups.get(entry.id) ?? { name: entry.name, instances: [] }
    if (!group.instances.includes(entry.instance_name)) group.instances.push(entry.instance_name)
    groups.set(entry.id, group)
  }
  return [...groups].map(([id, group]) => option(id, group.name, id, several ? group.instances.join('、') : ''))
}

/**
 * Matches for a search, best first: names starting with the query, then numbers starting with it, then anything
 * containing it. Nothing for an empty query.
 */
export function searchDirectory(options: readonly DirectoryOption[], query: string, limit = 8): DirectoryOption[] {
  const text = query.trim().toLowerCase()
  if (!text) return []
  const rank = (option: DirectoryOption) => {
    const name = option.name.toLowerCase()
    if (name.startsWith(text)) return 0
    if (option.id.startsWith(text)) return 1
    return name.includes(text) || option.id.includes(text) ? 2 : -1
  }
  return options
    .map(option => ({ option, rank: rank(option) }))
    .filter(item => item.rank >= 0)
    .sort((left, right) => left.rank - right.rank)
    .slice(0, limit)
    .map(item => item.option)
}

/** Pasted or typed values: split on commas and whitespace, trimmed, without blanks or repeats. */
export function normalizeDirectoryValues(values: readonly string[]) {
  return [...new Set(values.flatMap(value => value.split(/[,，\s]+/)).map(value => value.trim()).filter(Boolean))]
}
