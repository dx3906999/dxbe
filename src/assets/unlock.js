// Decrypts posts published with `encrypt: <name>` (see src/core/encrypt.ts).
// A correct password is kept in sessionStorage for this tab, so other posts
// that share it open without asking again.

const bytes = (base64) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))

async function decrypt(payload, password) {
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
  const key = await crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, [
    'decrypt',
  ])
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes(payload.iv) },
    key,
    bytes(payload.data),
  )
  return new TextDecoder().decode(plain)
}

function storageKey(name) {
  return `dxbe:password:${name}`
}

function remembered(name) {
  try {
    return sessionStorage.getItem(storageKey(name))
  } catch {
    return null
  }
}

function remember(name, password) {
  try {
    sessionStorage.setItem(storageKey(name), password)
  } catch {}
}

function forget(name) {
  try {
    sessionStorage.removeItem(storageKey(name))
  } catch {}
}

function reveal(locked, html) {
  const parent = locked.parentElement
  const template = document.createElement('template')
  template.innerHTML = html
  // replace the placeholder with the content itself so prose styles still apply
  locked.replaceWith(template.content)
  if (!parent) return
  // themes re-run their content enhancements (code headers, measurements) on this
  parent.dispatchEvent(new CustomEvent('dxbe:unlocked', { bubbles: true }))
  dispatchEvent(new Event('resize'))
}

for (const locked of document.querySelectorAll('[data-dxbe-locked]')) {
  const name = locked.dataset.dxbeLocked
  const payload = JSON.parse(locked.querySelector('.dxbe-locked__payload')?.textContent ?? '{}')
  const form = locked.querySelector('form')
  const input = locked.querySelector('input')
  const button = locked.querySelector('button')
  const error = locked.querySelector('.dxbe-locked__error')

  // WebCrypto only exists on https:// and localhost
  if (!crypto.subtle) {
    if (error) {
      error.textContent = 'HTTPS is required to unlock this post.'
      error.hidden = false
    }
    if (button) button.disabled = true
    continue
  }

  const saved = remembered(name)
  if (saved) {
    decrypt(payload, saved).then(
      (html) => reveal(locked, html),
      () => forget(name),
    )
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!input || !button) return
    button.disabled = true
    if (error) error.hidden = true
    try {
      const html = await decrypt(payload, input.value)
      remember(name, input.value)
      reveal(locked, html)
    } catch {
      if (error) error.hidden = false
      input.select()
    } finally {
      button.disabled = false
    }
  })
}
