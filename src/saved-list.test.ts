import { expect, test } from 'vitest'

import {
  cleanItemName,
  pushRecent,
  readCurrent,
  readRecent,
  readItems,
  removeItem,
  renameItem,
  suggestItemName,
  upsertItem,
  ITEM_NAME_MAX,
} from './saved-list.ts'

const RECENT_MAX = 8

test('a name loses its line breaks and its excess length', () => {
  expect(cleanItemName('  broken \n toy  ')).toBe('broken toy')
  expect(cleanItemName('x'.repeat(80))).toHaveLength(ITEM_NAME_MAX)
  expect(cleanItemName('   ')).toBe('')
})

test('a save lands at the end and an overwrite stays where it was', () => {
  const one = upsertItem([], 'a', 'p=1')
  const two = upsertItem(one, 'b', 'p=2')
  expect(upsertItem(two, 'a', 'p=9').map(v => v.name)).toEqual(['a', 'b'])
  expect(upsertItem(two, 'a', 'p=9')[0]!.query).toBe('p=9')
})

test('an overwrite keeps the id and restamps the save', () => {
  const first = upsertItem([], 'a', 'p=1', 10)
  const again = upsertItem(first, 'a', 'p=2', 30)
  expect(again[0]!.id).toBe(first[0]!.id)
  expect(again[0]!.savedAt).toBe(30)
})

test('a save with no clock carries no metadata, and an empty name saves nothing', () => {
  expect(upsertItem([], 'a', 'p=1')[0]).toEqual({ name: 'a', query: 'p=1' })
  expect(upsertItem([], '  ', 'p=1')).toEqual([])
})

test('the suggestion counts up only once the name is taken', () => {
  const list = upsertItem([], 'dying toy', 'p=1')
  expect(suggestItemName([], 'dying toy', 'my item')).toBe('dying toy')
  expect(suggestItemName(list, 'dying toy', 'my item')).toBe('dying toy 2')
  expect(
    suggestItemName(upsertItem(list, 'dying toy 2', 'p=2'), 'dying toy', 'my item'),
  ).toBe('dying toy 3')
  expect(suggestItemName([], '', 'my item')).toBe('my item')
})

test('a stored list drops whatever is not a voice', () => {
  expect(
    readItems([
      { name: 'a', query: 'p=1', savedAt: 5 },
      { name: 'b' },
      { name: '  ', query: 'p=2' },
      { name: 'c', query: 'x'.repeat(9000) },
      null,
      7,
      { name: 'd', query: 'p=3', savedAt: 'soon' },
    ]),
  ).toEqual([
    { name: 'a', query: 'p=1', savedAt: 5 },
    { name: 'd', query: 'p=3' },
  ])
  expect(readItems('nope')).toEqual([])
})

test('a stored session needs both halves', () => {
  expect(readCurrent({ query: 'p=1', at: 4 })).toEqual({ query: 'p=1', at: 4 })
  expect(readCurrent({ query: 'p=1' })).toBeNull()
  expect(readCurrent(null)).toBeNull()
})

test('delete takes the one name', () => {
  const list = upsertItem(upsertItem([], 'a', 'p=1'), 'b', 'p=2')
  expect(removeItem(list, 'a').map(v => v.name)).toEqual(['b'])
})

test('rename keeps the place, the id and the stamp', () => {
  const list = upsertItem(upsertItem([], 'a', 'p=1', 10), 'b', 'p=2')
  const renamed = renameItem(list, 'a', '  dying   toy ')
  expect(renamed.map(v => v.name)).toEqual(['dying toy', 'b'])
  expect(renamed[0]!.id).toBe(list[0]!.id)
  expect(renamed[0]!.savedAt).toBe(10)
})

test('rename refuses a name in use, or no name', () => {
  const list = upsertItem(upsertItem([], 'a', 'p=1'), 'b', 'p=2')
  expect(renameItem(list, 'a', 'b')).toEqual(list)
  expect(renameItem(list, 'a', '  ')).toEqual(list)
})

const r = (id: string, query = `p=${id}`, at = 1) => ({ id, query, at })

test('the recent list reads in stored order and drops bad entries', () => {
  expect(
    readRecent([r('a'), { query: 'p=1', at: 2 }, r('b'), null, r('a')], RECENT_MAX),
  ).toEqual([r('a'), r('b')])
  expect(readRecent(undefined, RECENT_MAX, { query: 'p=1', at: 9 })).toEqual([
    { id: '', query: 'p=1', at: 9 },
  ])
  expect(readRecent([], RECENT_MAX, { query: 'p=1', at: 9 })).toEqual([])
})

test('a session write moves its entry first and drops what falls off', () => {
  expect(pushRecent([r('a'), r('b')], r('b', 'p=moved', 5), RECENT_MAX).recent).toEqual([
    r('b', 'p=moved', 5),
    r('a'),
  ])
  expect(pushRecent([r('a'), r('b')], r('c', 'p=b'), RECENT_MAX).dropped).toEqual(['b'])
  const full = Array.from({ length: RECENT_MAX }, (_, i) => r(`s${i}`))
  const { recent, dropped } = pushRecent(full, r('new'), RECENT_MAX)
  expect(recent).toHaveLength(RECENT_MAX)
  expect(dropped).toEqual([`s${RECENT_MAX - 1}`])
})
