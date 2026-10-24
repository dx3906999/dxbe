const root = document.documentElement
const zh = root.lang.startsWith('zh')
const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- light / dark ---------- */

const darkQuery = matchMedia('(prefers-color-scheme: dark)')

function activeScheme() {
  return root.dataset.scheme || (darkQuery.matches ? 'dark' : 'light')
}

function paintScheme() {
  root.dataset.schemeActive = activeScheme()
}

paintScheme()
darkQuery.addEventListener('change', paintScheme)

document.querySelector('[data-scheme-toggle]')?.addEventListener('click', () => {
  const next = activeScheme() === 'dark' ? 'light' : 'dark'
  root.dataset.scheme = next
  try {
    localStorage.setItem('capstan.scheme', next)
  } catch {}
  paintScheme()
})

/* ---------- deck drawer (small screens) ---------- */

const deck = document.getElementById('cp-deck')
const menu = document.querySelector('[data-deck-toggle]')

function setDeck(open) {
  if (!deck || !menu) return
  if (open) deck.setAttribute('data-open', '')
  else deck.removeAttribute('data-open')
  menu.setAttribute('aria-expanded', String(open))
}

menu?.addEventListener('click', () => setDeck(!deck?.hasAttribute('data-open')))
document.querySelector('[data-deck-close]')?.addEventListener('click', () => setDeck(false))
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setDeck(false)
})

/* ---------- code monitors ---------- */

const copyLabel = zh ? ['复制', '已复制'] : ['COPY', 'DONE']

for (const pre of document.querySelectorAll('.cp-prose pre')) {
  const code = pre.querySelector('code')
  const lang =
    pre.dataset.language ||
    [...(code?.classList ?? [])].find((name) => name.startsWith('language-'))?.slice(9) ||
    'text'
  const lines = pre.querySelectorAll('.line').length || (code?.textContent ?? '').split('\n').length
  const frame = document.createElement('figure')
  frame.className = 'cp-code'
  frame.innerHTML = `<figcaption class="cp-code__bar"><span class="cp-engrave cp-code__lang"></span><span class="cp-engrave cp-code__lines"></span><button class="cp-code__copy" type="button"></button></figcaption><div class="cp-crt"><div class="cp-crt__glass"></div></div>`
  frame.querySelector('.cp-code__lang').textContent = lang
  frame.querySelector('.cp-code__lines').textContent = `${String(lines).padStart(3, '0')} LN`
  const button = frame.querySelector('.cp-code__copy')
  button.textContent = copyLabel[0]
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code?.innerText ?? pre.innerText)
      button.textContent = copyLabel[1]
      button.setAttribute('data-done', '')
      setTimeout(() => {
        button.textContent = copyLabel[0]
        button.removeAttribute('data-done')
      }, 1400)
    } catch {}
  })
  pre.replaceWith(frame)
  frame.querySelector('.cp-crt__glass').append(pre)
}

/* ---------- transport: rollers, counter, level, index ---------- */

const knurls = [...document.querySelectorAll('[data-knurl]')]
const reels = [...document.querySelectorAll('[data-counter] .cp-digit__reel')]
const meter = [...document.querySelectorAll('[data-level] i')]
const levelText = document.querySelector('[data-level-text]')
const tocLinks = [...document.querySelectorAll('[data-toc]')]
const headings = tocLinks.map((link) => document.getElementById(link.dataset.toc)).filter(Boolean)
const tocScreen = tocLinks[0]?.closest('.cp-crt__glass')
const strip = document.querySelector('.cp-strip')
const feedTop = document.querySelector('[data-feed="top"]')
const feedBottom = document.querySelector('[data-feed="bottom"]')

const RIB = 5 // px between knurl ridges; must match the CSS gradient period
const COUNTER_STEP = 8 // px of paper per counter tick
const PAPER_PERIOD = 168 // green-bar period; the 24px hole pitch divides it

let offsets = []
let maxScroll = 1
let lastDigits = []
let lastLit = -1
let lastActive = -2
let stripTop = 0
let stripBottom = 0
let rollerH = 0
let stickTop = 0
let viewH = innerHeight

function measure() {
  viewH = innerHeight
  maxScroll = Math.max(1, root.scrollHeight - viewH)
  offsets = headings.map((heading) => heading.getBoundingClientRect().top + scrollY)
  if (strip && feedTop) {
    const box = strip.getBoundingClientRect()
    stripTop = box.top + scrollY
    stripBottom = box.bottom + scrollY
    const roller = feedTop.closest('.cp-roller')
    rollerH = roller.offsetHeight
    stickTop = Number.parseFloat(getComputedStyle(roller).top) || 0
  }
}

/* Shift the paper drawn on a drum so its holes and bands line up with the strip
   at the drum's screen position (sticky rollers clamp to the strip's ends). */
function feedOffset(screenTop, y) {
  const docTop = screenTop + y - stripTop
  return `${(-(((docTop % PAPER_PERIOD) + PAPER_PERIOD) % PAPER_PERIOD)).toFixed(2)}px`
}

function setDigit(reel, index, next) {
  const prev = lastDigits[index]
  if (prev === next) return
  // roll forward through the spare 0 when wrapping 9 -> 0
  if (prev === 9 && next === 0 && motion) {
    reel.style.setProperty('--d', '10')
    reel.addEventListener(
      'transitionend',
      () => {
        reel.classList.add('is-snap')
        reel.style.setProperty('--d', '0')
        requestAnimationFrame(() => reel.classList.remove('is-snap'))
      },
      { once: true },
    )
  } else {
    reel.style.setProperty('--d', String(next))
  }
  lastDigits[index] = next
}

function update() {
  const y = Math.max(0, scrollY)

  // the drum surface travels with the paper, so ridges move up as the strip does
  const roll = `${(-(y % RIB)).toFixed(2)}px`
  for (const knurl of knurls) knurl.style.setProperty('--roll', roll)
  if (feedTop) {
    const top = Math.max(stickTop, stripTop - y)
    feedTop.style.setProperty('--feed', feedOffset(top, y))
  }
  if (feedBottom) {
    const bottom = Math.min(viewH, stripBottom - y)
    feedBottom.style.setProperty('--feed', feedOffset(bottom - rollerH, y))
  }

  if (reels.length > 0) {
    const value = Math.floor(y / COUNTER_STEP) % 10 ** reels.length
    const digits = String(value).padStart(reels.length, '0').split('').map(Number)
    reels.forEach((reel, i) => setDigit(reel, i, digits[i]))
  }

  const p = Math.min(1, y / maxScroll)
  if (meter.length > 0) {
    const lit = Math.round(p * meter.length)
    if (lit !== lastLit) {
      meter.forEach((segment, i) => segment.classList.toggle('is-lit', i < lit))
      if (levelText) levelText.textContent = String(Math.round(p * 100)).padStart(3, '0')
      lastLit = lit
    }
  }

  if (tocLinks.length > 0) {
    const line = y + 150
    let active = -1
    for (let i = 0; i < offsets.length; i += 1) {
      if (offsets[i] <= line) active = i
    }
    if (y >= maxScroll - 2) active = offsets.length - 1
    if (active !== lastActive) {
      tocLinks.forEach((link, i) => {
        link.classList.toggle('is-active', i === active)
        link.classList.toggle('is-passed', i < active)
      })
      // keep the active line on screen without moving the page
      const current = tocLinks[active]
      if (current && tocScreen) {
        const top = current.offsetTop
        const view = tocScreen.clientHeight
        if (top < tocScreen.scrollTop + 20 || top > tocScreen.scrollTop + view - 40) {
          tocScreen.scrollTo({ top: Math.max(0, top - view / 2), behavior: motion ? 'smooth' : 'auto' })
        }
      }
      lastActive = active
    }
  }
}

/* ---------- signal meter: needle swings with scroll speed ---------- */

const needle = document.querySelector('[data-needle]')
let needlePos = 0
let needleVel = 0
let needleTarget = 0
let needleRunning = false
let lastY = scrollY
let lastT = performance.now()

function needleFrame() {
  // damped spring towards a target that decays like VU ballistics
  needleTarget *= 0.92
  needleVel += ((needleTarget - needlePos) * 0.18 - needleVel * 0.32)
  needlePos = Math.min(1.08, Math.max(-0.02, needlePos + needleVel))
  needle.style.setProperty('--a', `${(-50 + needlePos * 100).toFixed(2)}deg`)
  if (needleTarget > 0.002 || Math.abs(needlePos) > 0.002 || Math.abs(needleVel) > 0.002) {
    requestAnimationFrame(needleFrame)
  } else {
    needleRunning = false
  }
}

function kickNeedle() {
  if (!needle || !motion) return
  const now = performance.now()
  const speed = Math.abs(scrollY - lastY) / Math.max(8, now - lastT)
  lastY = scrollY
  lastT = now
  needleTarget = Math.max(needleTarget, Math.min(1, speed / 4))
  if (!needleRunning) {
    needleRunning = true
    requestAnimationFrame(needleFrame)
  }
}

let queued = false
function schedule() {
  kickNeedle()
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    update()
  })
}

measure()
update()
addEventListener('scroll', schedule, { passive: true })
addEventListener('resize', () => {
  measure()
  schedule()
})
addEventListener('load', () => {
  measure()
  schedule()
})
