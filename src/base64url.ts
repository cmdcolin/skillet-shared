export const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

export function toBase64Url(bytes: readonly number[]): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n =
      ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    const left = bytes.length - i
    out += (B64[(n >> 18) & 63] ?? '') + (B64[(n >> 12) & 63] ?? '')
    if (left > 1) out += B64[(n >> 6) & 63] ?? ''
    if (left > 2) out += B64[n & 63] ?? ''
  }
  return out
}

// Reads '+' and '/' as themselves. The first character outside the alphabet
// ends the board: '=' from an encoder that pads, or whatever the link picked up
// on its way here, such as the full stop of the sentence it was pasted into.
export function fromBase64Url(text: string): number[] {
  const bytes: number[] = []
  let acc = 0
  let bits = 0
  for (const ch of text) {
    const v = B64.indexOf(ch === '+' ? '-' : ch === '/' ? '_' : ch)
    if (v < 0) break
    acc = (acc << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes.push((acc >> bits) & 0xff)
    }
  }
  return bytes
}
