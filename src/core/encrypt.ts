import { createCipheriv, createHash, createHmac, pbkdf2Sync } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'
import { BuildError } from '../shared/errors.ts'
import { jsonForScript } from '../shared/html.ts'

/** OWASP's 2023 recommendation for PBKDF2-HMAC-SHA256. */
export const PBKDF2_ITERATIONS = 600_000

export const PASSWORDS_FILE = 'passwords.yml'

export interface EncryptedPayload {
  v: 1
  iter: number
  salt: string
  iv: string
  data: string
}

/**
 * Encrypt rendered HTML for in-browser decryption with WebCrypto.
 *
 * PBKDF2 derives 64 bytes: the first half is the AES-256-GCM key, the second
 * an HMAC key. The salt comes from the post's identity and the IV is an HMAC
 * of the plaintext, so a rebuild produces identical bytes (the determinism
 * check depends on that) while a given key never reuses an IV for different
 * content.
 */
export function encryptHtml(html: string, password: string, context: string): EncryptedPayload {
  const salt = createHash('sha256').update(`dxbe-encrypt\0${context}`).digest().subarray(0, 16)
  const bits = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, 'sha256')
  const key = bits.subarray(0, 32)
  const iv = createHmac('sha256', bits.subarray(32)).update(html).digest().subarray(0, 12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  // WebCrypto expects the GCM tag appended to the ciphertext
  const data = Buffer.concat([cipher.update(html, 'utf8'), cipher.final(), cipher.getAuthTag()])
  return {
    v: 1,
    iter: PBKDF2_ITERATIONS,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    data: data.toString('base64'),
  }
}

function envName(name: string): string {
  return `DXBE_PASSWORD_${name.toUpperCase().replaceAll('-', '_')}`
}

/**
 * Passwords by name, from passwords.yml (kept out of git) and
 * DXBE_PASSWORD_<NAME> environment variables, which win.
 */
export async function loadPasswords(root: string): Promise<(name: string) => string | undefined> {
  let fromFile: Record<string, unknown> = {}
  try {
    const parsed = parseYaml(await readFile(path.join(root, PASSWORDS_FILE), 'utf8')) ?? {}
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BuildError(`${PASSWORDS_FILE} must map names to passwords`, {
        code: 'CONFIG',
        file: PASSWORDS_FILE,
      })
    }
    fromFile = parsed as Record<string, unknown>
  } catch (error) {
    if (error instanceof BuildError) throw error
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new BuildError(`Failed to read ${PASSWORDS_FILE}`, {
        code: 'CONFIG',
        file: PASSWORDS_FILE,
        cause: error,
      })
    }
  }
  return (name) => {
    const value = process.env[envName(name)] ?? fromFile[name]
    if (value === undefined || value === null) return undefined
    return String(value)
  }
}

export function missingPasswordHint(name: string): string {
  return `add "${name}: <password>" to ${PASSWORDS_FILE} or set ${envName(name)}`
}

const STRINGS = {
  zh: {
    title: '这篇文章已加密',
    hint: '输入密码后阅读。',
    label: '密码',
    unlock: '解锁',
    wrong: '密码不对，再试一次。',
    noscript: '解锁需要 JavaScript。',
  },
  en: {
    title: 'This post is encrypted',
    hint: 'Enter the password to read it.',
    label: 'Password',
    unlock: 'Unlock',
    wrong: 'Wrong password. Try again.',
    noscript: 'Unlocking needs JavaScript.',
  },
}

const SUMMARIES = { zh: '这篇文章已加密。', en: 'This post is encrypted.' }

/** Used when an encrypted post has no summary, so no excerpt of the content leaks. */
export function lockedSummary(lang: string): string {
  return SUMMARIES[lang as keyof typeof SUMMARIES] ?? SUMMARIES.en
}

/** The placeholder a theme prints instead of the post body; unlock.js swaps it for the content. */
export function lockedHtml(
  payload: EncryptedPayload,
  name: string,
  lang: string,
  scriptUrl: string,
): string {
  const t = STRINGS[lang as keyof typeof STRINGS] ?? STRINGS.en
  return `<div class="dxbe-locked" data-dxbe-locked="${name}" data-pagefind-ignore="all">
<form class="dxbe-locked__form">
<p class="dxbe-locked__title">${t.title}</p>
<p class="dxbe-locked__hint">${t.hint}</p>
<div class="dxbe-locked__row">
<input class="dxbe-locked__input" type="password" name="password" autocomplete="current-password" required aria-label="${t.label}" placeholder="${t.label}">
<button class="dxbe-locked__button" type="submit">${t.unlock}</button>
</div>
<p class="dxbe-locked__error" role="alert" hidden>${t.wrong}</p>
</form>
<noscript><p>${t.noscript}</p></noscript>
<script type="application/json" class="dxbe-locked__payload">${jsonForScript(payload)}</script>
</div>
<script type="module" src="${scriptUrl}"></script>`
}
