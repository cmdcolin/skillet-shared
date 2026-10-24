export const SETTLE_MS = 5000
export const MIN_GAP_MS = 10000

export interface WriteGate {
  query: string | null
  at: number
}

// When a newly settled board may be written, or null when the account already
// has it. The debounce measures from now and the rate limit from the last write
// that landed, and the later of the two wins.
export function nextWriteAt(
  gate: WriteGate,
  query: string,
  now: number,
): number | null {
  if (query === gate.query) return null
  return Math.max(now + SETTLE_MS, gate.at + MIN_GAP_MS)
}

export interface Opened {
  query: string | null
  moved: boolean
}

// The first board a page shows is where it opened: the stock board from the
// home page's app button, or a finished one from a demo or a shared link. The
// session starts when the board first differs from it.
export function observe(opened: Opened, query: string | null): Opened {
  if (query === null || opened.moved) return opened
  if (opened.query === null) return { query, moved: false }
  return query === opened.query ? opened : { ...opened, moved: true }
}
