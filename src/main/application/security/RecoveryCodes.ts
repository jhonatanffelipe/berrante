import type { Hasher } from '@main/domain/ports'

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

/** 10 códigos "xxxxx-xxxxx". Só os hashes SHA-256 são persistidos. */
export function generateRecoveryCodes(hasher: Hasher, count = 10): { codes: string[]; hashes: string[] } {
  const codes: string[] = []
  while (codes.length < count) {
    const hex = hasher.randomToken(10)
    let s = ''
    for (let i = 0; i < 10; i++) s += ALPHABET[parseInt(hex.slice(i * 2, i * 2 + 2), 16) % ALPHABET.length]
    const code = `${s.slice(0, 5)}-${s.slice(5)}`
    if (!codes.includes(code)) codes.push(code)
  }
  return { codes, hashes: codes.map((c) => hasher.hash(c)) }
}
