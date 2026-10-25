import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { type EncryptedPayload, encryptHtml, loadPasswords } from '../src/core/encrypt.ts'

const bytes = (base64: string) => Uint8Array.from(Buffer.from(base64, 'base64'))

/** The same WebCrypto steps as src/assets/unlock.js. */
async function decrypt(payload: EncryptedPayload, password: string): Promise<string> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: bytes(payload.salt), iterations: payload.iter },
    material,
    512,
  )
  const key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['decrypt'])
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes(payload.iv) },
    key,
    bytes(payload.data),
  )
  return new TextDecoder().decode(plain)
}

describe('post encryption', () => {
  const html = '<p>私密内容 with <code>code</code></p>'

  it('round-trips through the browser decryption', async () => {
    const payload = encryptHtml(html, 'correct horse', 'zh/diary/diary')
    expect(payload.data).not.toContain('私密')
    expect(await decrypt(payload, 'correct horse')).toBe(html)
  })

  it('rejects a wrong password', async () => {
    const payload = encryptHtml(html, 'correct horse', 'zh/diary/diary')
    await expect(decrypt(payload, 'wrong horse')).rejects.toThrow()
  })

  it('is deterministic per post but never reuses an IV across content', () => {
    const a = encryptHtml(html, 'pw', 'zh/a/diary')
    expect(encryptHtml(html, 'pw', 'zh/a/diary')).toEqual(a)
    expect(encryptHtml(`${html} `, 'pw', 'zh/a/diary').iv).not.toBe(a.iv)
    expect(encryptHtml(html, 'pw', 'zh/b/diary').salt).not.toBe(a.salt)
  })
})

describe('password lookup', () => {
  let dir: string | undefined

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true })
    delete process.env.DXBE_PASSWORD_MY_DIARY
  })

  it('reads passwords.yml and lets the environment win', async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'dxbe-passwords-'))
    await writeFile(path.join(dir, 'passwords.yml'), 'my-diary: from-file\nnumeric: 1234\n')
    process.env.DXBE_PASSWORD_MY_DIARY = 'from-env'
    const password = await loadPasswords(dir)
    expect(password('my-diary')).toBe('from-env')
    expect(password('numeric')).toBe('1234')
    expect(password('missing')).toBeUndefined()
  })
})
