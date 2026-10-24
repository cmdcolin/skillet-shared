import { expect, test } from 'vitest'

import { MIN_GAP_MS, nextWriteAt, observe, SETTLE_MS } from './session-gate.ts'

test('a board the account already holds writes nothing', () => {
  expect(nextWriteAt({ query: 'a', at: 0 }, 'a', 100)).toBeNull()
})

test('a write waits for the settle and for the gap since the last write', () => {
  expect(nextWriteAt({ query: null, at: 0 }, 'a', 100)).toBe(
    Math.max(100 + SETTLE_MS, MIN_GAP_MS),
  )
  expect(nextWriteAt({ query: 'a', at: 50000 }, 'b', 51000)).toBe(
    50000 + MIN_GAP_MS,
  )
})

test('the session starts when the board leaves where the page opened', () => {
  const start = observe({ query: null, moved: false }, 'a')
  expect(start).toEqual({ query: 'a', moved: false })
  expect(observe(start, 'a')).toBe(start)
  expect(observe(start, 'b')).toEqual({ query: 'a', moved: true })
  expect(observe(observe(start, 'b'), 'a').moved).toBe(true)
})
