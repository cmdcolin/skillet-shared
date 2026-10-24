export interface SavedItem {
  name: string
  query: string
  id?: string
  savedAt?: number
}

export interface CurrentSession {
  query: string
  at: number
}

export interface RecentSession extends CurrentSession {
  id: string
}

export const ITEM_MAX = 200
export const QUERY_MAX = 8000
export const ITEM_NAME_MAX = 40

export const newItemId = (): string => Math.random().toString(36).slice(2, 10)

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined

export const cleanItemName = (raw: string): string =>
  raw.replaceAll(/\s+/g, ' ').trim().slice(0, ITEM_NAME_MAX).trim()

function readItem(raw: unknown): SavedItem | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const name = 'name' in raw ? raw.name : undefined
  const query = 'query' in raw ? raw.query : undefined
  if (typeof name !== 'string' || typeof query !== 'string') return undefined
  if (query.length > QUERY_MAX) return undefined
  const clean = cleanItemName(name)
  if (clean === '') return undefined
  const id = 'id' in raw && typeof raw.id === 'string' ? raw.id : undefined
  const savedAt = 'savedAt' in raw ? num(raw.savedAt) : undefined
  return {
    name: clean,
    query,
    ...(id === undefined ? {} : { id }),
    ...(savedAt === undefined ? {} : { savedAt }),
  }
}

export const readItems = (raw: unknown): SavedItem[] =>
  (Array.isArray(raw) ? raw : [])
    .flatMap(item => {
      const parsed = readItem(item)
      return parsed === undefined ? [] : [parsed]
    })
    .slice(0, ITEM_MAX)

export function readCurrent(raw: unknown): CurrentSession | null {
  if (typeof raw !== 'object' || raw === null) return null
  const query = 'query' in raw ? raw.query : undefined
  const at = 'at' in raw ? num(raw.at) : undefined
  if (typeof query !== 'string' || query.length > QUERY_MAX) return null
  return at === undefined ? null : { query, at }
}

export function readRecent(
  raw: unknown,
  recentMax: number,
  legacy?: unknown,
): RecentSession[] {
  if (!Array.isArray(raw)) {
    const current = readCurrent(legacy)
    return current === null ? [] : [{ id: '', ...current }]
  }
  const seen = new Set<string>()
  return raw
    .flatMap(item => {
      const session = readCurrent(item)
      const id =
        typeof item === 'object' && item !== null && 'id' in item
          ? item.id
          : undefined
      if (session === null || typeof id !== 'string' || seen.has(id)) return []
      seen.add(id)
      return [{ id, ...session }]
    })
    .slice(0, recentMax)
}

export function pushRecent(
  recent: readonly RecentSession[],
  entry: RecentSession,
  recentMax: number,
): { recent: RecentSession[]; dropped: string[] } {
  const next = [
    entry,
    ...recent.filter(s => s.id !== entry.id && s.query !== entry.query),
  ].slice(0, recentMax)
  const kept = new Set(next.map(s => s.id))
  return {
    recent: next,
    dropped: recent.flatMap(s => (kept.has(s.id) ? [] : [s.id])),
  }
}

export const removeRecent = (
  recent: readonly RecentSession[],
  id: string,
): RecentSession[] => recent.filter(item => item.id !== id)

export function upsertItem(
  items: readonly SavedItem[],
  name: string,
  query: string,
  at?: number,
): SavedItem[] {
  const clean = cleanItemName(name)
  if (clean === '') return [...items]
  const index = items.findIndex(item => item.name === clean)
  const prior = index === -1 ? undefined : items[index]
  const entry: SavedItem = { name: clean, query }
  if (prior?.id !== undefined) entry.id = prior.id
  if (at !== undefined) {
    entry.id ??= newItemId()
    entry.savedAt = at
  }
  if (index !== -1) return items.map((item, i) => (i === index ? entry : item))
  return [...items, entry].slice(-ITEM_MAX)
}

export const removeItem = (
  items: readonly SavedItem[],
  name: string,
): SavedItem[] => items.filter(item => item.name !== name)

export function renameItem(
  items: readonly SavedItem[],
  from: string,
  to: string,
): SavedItem[] {
  const clean = cleanItemName(to)
  if (clean === '' || items.some(item => item.name === clean)) return [...items]
  return items.map(item =>
    item.name === from ? { ...item, name: clean } : item,
  )
}

export function suggestItemName(
  items: readonly SavedItem[],
  base: string,
  fallback: string,
): string {
  const clean = cleanItemName(base)
  const stem = clean === '' ? fallback : clean
  if (!items.some(item => item.name === stem)) return stem
  for (let n = 2; n < 1000; n++) {
    const candidate = `${stem} ${n}`
    if (!items.some(item => item.name === candidate)) return candidate
  }
  return stem
}
