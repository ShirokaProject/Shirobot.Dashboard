// Catalog sources for plugins and adapters. The official source is whatever the backend
// serves by default; third-party sources are stored per browser and passed to the backend
// as `?source=`. Plugins and adapters keep separate lists (the `scope` argument).

export type SourceScope = 'plugins' | 'adapters'

export interface CatalogSource {
  id: string
  name: string
  /** '' for the backend default (official); otherwise a GitHub `owner/repo` or catalog URL. */
  url: string
  builtIn?: boolean
}

// Plugin keys predate adapter support, so they stay unprefixed.
const KEYS: Record<SourceScope, { sources: string; active: string; direct: string }> = {
  plugins: {
    sources: 'shirobot.dashboard.catalogSources',
    active: 'shirobot.dashboard.catalogSource',
    direct: 'shirobot.dashboard.directRepos'
  },
  adapters: {
    sources: 'shirobot.dashboard.adapter.catalogSources',
    active: 'shirobot.dashboard.adapter.catalogSource',
    direct: 'shirobot.dashboard.adapter.directRepos'
  }
}

export const OFFICIAL_SOURCE: CatalogSource = { id: 'official', name: '官方源', url: '', builtIn: true }

function readCustom(scope: SourceScope): CatalogSource[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEYS[scope].sources) ?? '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is CatalogSource =>
      Boolean(item) && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.url === 'string'
    )
  } catch {
    return []
  }
}

function writeCustom(scope: SourceScope, sources: CatalogSource[]) {
  try {
    localStorage.setItem(KEYS[scope].sources, JSON.stringify(sources))
  } catch {
    // Storage unavailable: sources last for this page only.
  }
}

export function listCatalogSources(scope: SourceScope = 'plugins'): CatalogSource[] {
  return [OFFICIAL_SOURCE, ...readCustom(scope)]
}

export function getActiveCatalogSource(scope: SourceScope = 'plugins'): CatalogSource {
  let id: string | null = null
  try {
    id = localStorage.getItem(KEYS[scope].active)
  } catch {
    // ignore
  }
  return listCatalogSources(scope).find(source => source.id === id) ?? OFFICIAL_SOURCE
}

export function setActiveCatalogSource(id: string, scope: SourceScope = 'plugins') {
  try {
    localStorage.setItem(KEYS[scope].active, id)
  } catch {
    // ignore
  }
}

/** Accepts `owner/repo`, a github.com URL, or any https URL to a catalog JSON. */
export function normalizeCatalogUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '')
  const github = trimmed.match(/^(?:https?:\/\/)?github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?$/i)
  if (github) return github[1]
  return trimmed
}

export function isValidCatalogUrl(value: string) {
  return /^[\w.-]+\/[\w.-]+$/.test(value) || /^https:\/\/\S+$/i.test(value)
}

export function addCatalogSource(name: string, url: string, scope: SourceScope = 'plugins'): CatalogSource {
  const source: CatalogSource = {
    id: `source-${Date.now().toString(36)}`,
    name: name.trim() || url,
    url
  }
  writeCustom(scope, [...readCustom(scope).filter(item => item.url !== url), source])
  return source
}

export function removeCatalogSource(id: string, scope: SourceScope = 'plugins') {
  writeCustom(scope, readCustom(scope).filter(source => source.id !== id))
}

/**
 * `owner/repo` for a bare slug or any github.com repository URL (with or without .git,
 * trailing paths like /tree/main), else null. Links are always rebuilt on github.com.
 */
/**
 * Splits "owner/name" (or "host/path/name") for display: the part up to the last "/" and the name,
 * each cut after "/" and "." so a narrow column can wrap there instead of mid-word.
 */
export function repoPathParts(path: string) {
  const cut = path.lastIndexOf('/') + 1
  const pieces = (text: string) => text.split(/(?<=[./])/).filter(Boolean)
  return { owner: pieces(path.slice(0, cut)), name: pieces(path.slice(cut)) }
}

export function githubRepoOf(value: string) {
  const trimmed = value.trim()
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) return trimmed
  const match = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i)
  return match ? `${match[1]}/${match[2]}` : null
}

/** Host + path for non-GitHub https repository URLs, shown as text with a generic link icon. */
export function otherRepoOf(value: string) {
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:') return null
    return { href: url.href, domain: url.hostname, label: `${url.host}${url.pathname.replace(/\/$/, '')}` }
  } catch {
    return null
  }
}

// ---------- direct plugin repositories ----------
// A single plugin repo added by address, outside any catalog. The backend resolves it
// against the Shirobot release rules; the frontend only recognises and stores the address.

/** What the add-source dialog creates: one plugin repo, or a catalog listing many. */
export type SourceType = 'repo' | 'catalog'

export type RepoHost = 'github' | 'gitea'

export interface ParsedRepository {
  host: RepoHost
  /** Hostname, e.g. github.com or git.example.com */
  domain: string
  owner: string
  repo: string
  /** Canonical https URL sent to the backend. */
  url: string
}

export interface DirectRepository extends ParsedRepository {
  id: string
}

/**
 * Recognise `owner/repo` (GitHub), github.com URLs, and any other https `host/owner/repo`
 * (treated as Gitea/Forgejo-style self-hosted). Returns null when it can't be a repository.
 */
export function parseRepository(input: string): ParsedRepository | null {
  const trimmed = input.trim().replace(/\/+$/, '')
  const slug = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/)
  if (slug) {
    return { host: 'github', domain: 'github.com', owner: slug[1], repo: slug[2], url: `https://github.com/${slug[1]}/${slug[2]}` }
  }

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const [owner, rawRepo] = url.pathname.split('/').filter(Boolean)
  const repo = rawRepo?.replace(/\.git$/i, '')
  if (!owner || !repo || !/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null

  const domain = url.hostname.replace(/^www\./, '')
  const host: RepoHost = domain === 'github.com' ? 'github' : 'gitea'
  return { host, domain, owner, repo, url: `https://${domain}/${owner}/${repo}` }
}

export function repoHostLabel(repo: Pick<ParsedRepository, 'host' | 'domain'>) {
  return repo.host === 'github' ? 'GitHub' : repo.domain
}

export function listDirectRepos(scope: SourceScope = 'plugins'): DirectRepository[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEYS[scope].direct) ?? '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is DirectRepository =>
      Boolean(item) && typeof item.id === 'string' && typeof item.url === 'string' && typeof item.owner === 'string'
    )
  } catch {
    return []
  }
}

function writeDirectRepos(scope: SourceScope, repos: DirectRepository[]) {
  try {
    localStorage.setItem(KEYS[scope].direct, JSON.stringify(repos))
  } catch {
    // Storage unavailable: repos last for this page only.
  }
}

export function addDirectRepo(parsed: ParsedRepository, scope: SourceScope = 'plugins'): DirectRepository {
  const repo: DirectRepository = { ...parsed, id: `repo-${Date.now().toString(36)}` }
  writeDirectRepos(scope, [...listDirectRepos(scope).filter(item => item.url !== parsed.url), repo])
  return repo
}

export function removeDirectRepo(id: string, scope: SourceScope = 'plugins') {
  writeDirectRepos(scope, listDirectRepos(scope).filter(repo => repo.id !== id))
}
