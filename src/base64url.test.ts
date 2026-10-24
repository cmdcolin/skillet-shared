import { expect, test } from 'vitest'

import { fromBase64Url, toBase64Url } from './base64url.ts'

test('bytes round-trip without padding', () => {
  for (const n of [0, 1, 2, 3, 4, 50]) {
    const bytes = Array.from({ length: n }, (_, i) => (i * 37 + 11) & 0xff)
    const text = toBase64Url(bytes)
    expect(text).not.toContain('=')
    expect(fromBase64Url(text)).toEqual(bytes)
  }
})

test('the first foreign character ends the board', () => {
  const text = toBase64Url([1, 2, 3, 4])
  expect(fromBase64Url(`${text}.)tail`)).toEqual([1, 2, 3, 4])
  expect(fromBase64Url(`${text}==`)).toEqual([1, 2, 3, 4])
})

test('plus and slash read as the url-safe pair', () => {
  expect(fromBase64Url('+/')).toEqual(fromBase64Url('-_'))
})
