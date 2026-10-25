const root = document.documentElement
const body = document.body
const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- light / dark ---------- */

const darkQuery = matchMedia('(prefers-color-scheme: dark)')
const schemeLabel = document.querySelector('[data-scheme-label]')
const schemeNames = {
  light: document.documentElement.lang.startsWith('zh') ? '昼' : 'DAY',
  dark: document.documentElement.lang.startsWith('zh') ? '夜' : 'NIGHT',
}

function activeScheme() {
  return root.dataset.scheme || (darkQuery.matches ? 'dark' : 'light')
}

function paintScheme() {
  const scheme = activeScheme()
  root.dataset.schemeActive = scheme
  if (schemeLabel) schemeLabel.textContent = schemeNames[scheme]
}

paintScheme()
darkQuery.addEventListener('change', paintScheme)

document.querySelector('[data-scheme-toggle]')?.addEventListener('click', () => {
  const next = activeScheme() === 'dark' ? 'light' : 'dark'
  root.dataset.scheme = next
  try {
    localStorage.setItem('apogee.scheme', next)
  } catch {}
  paintScheme()
})

/* ---------- rail drawer (small screens) ---------- */

const rail = document.getElementById('ap-rail')
const menu = document.querySelector('[data-rail-toggle]')

function setRail(open) {
  if (!rail || !menu) return
  if (open) rail.setAttribute('data-open', '')
  else rail.removeAttribute('data-open')
  menu.setAttribute('aria-expanded', String(open))
}

menu?.addEventListener('click', () => setRail(!rail?.hasAttribute('data-open')))
document.querySelector('[data-rail-close]')?.addEventListener('click', () => setRail(false))
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setRail(false)
})

/* ---------- mission elapsed time ---------- */

const met = document.querySelector('[data-met]')
if (met) {
  const parsed = Date.parse(body.dataset.epoch || '')
  const epoch = Number.isNaN(parsed) ? Date.now() : parsed
  const two = (n) => String(n).padStart(2, '0')
  let timer = 0
  const tick = () => {
    const total = Math.max(0, Math.floor((Date.now() - epoch) / 1000))
    const days = Math.floor(total / 86400)
    const h = Math.floor((total % 86400) / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    met.textContent = `T+ ${String(days).padStart(3, '0')}:${two(h)}:${two(m)}:${two(s)}`
  }
  const start = () => {
    clearInterval(timer)
    tick()
    timer = setInterval(tick, 1000)
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearInterval(timer)
    else start()
  })
  start()
}

/* ---------- reading progress + checklist ---------- */

const bar = document.querySelector('[data-progress]')
const gaugeFill = document.querySelector('[data-progress-v]')
const gaugeText = document.querySelector('[data-progress-text]')
const gaugeSec = document.querySelector('[data-gauge-sec]')
const tocLinks = [...document.querySelectorAll('[data-toc]')]
const headings = tocLinks
  .map((link) => document.getElementById(link.dataset.toc))
  .filter(Boolean)
// TOC indices of the top-level chapters, for the SEC readout
const chapters = tocLinks
  .map((link, i) => (link.closest('[data-level]')?.dataset.level === '0' ? i : -1))
  .filter((i) => i >= 0)

let offsets = []
let maxScroll = 1
let lastActive = -2
let lastPct = -1

function measure() {
  maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight)
  offsets = headings.map((heading) => heading.getBoundingClientRect().top + scrollY)
}

function update() {
  const y = scrollY
  const p = Math.min(1, Math.max(0, y / maxScroll))
  bar?.style.setProperty('--p', p.toFixed(4))
  gaugeFill?.style.setProperty('--p', p.toFixed(4))
  const pct = Math.round(p * 100)
  if (gaugeText && pct !== lastPct) {
    gaugeText.textContent = String(pct).padStart(3, '0')
    lastPct = pct
  }
  if (tocLinks.length > 0) {
    const line = y + 140
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
      if (gaugeSec && chapters.length > 0) {
        const current = chapters.filter((index) => index <= active).length
        gaugeSec.textContent = `SEC ${String(current).padStart(2, '0')}/${String(chapters.length).padStart(2, '0')}`
      }
      lastActive = active
    }
  }
}

if (bar || gaugeFill || tocLinks.length > 0) {
  let queued = false
  const schedule = () => {
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
}

/* ---------- code readouts ---------- */

const copyLabel = document.documentElement.lang.startsWith('zh') ? ['复制', '已复制'] : ['COPY', 'DONE']

// idempotent: encrypted posts insert their content after this script ran
function decorateCode() {
  for (const pre of document.querySelectorAll('.ap-prose pre')) {
    if (pre.closest('.ap-code')) continue
    const code = pre.querySelector('code')
    const lang =
      pre.dataset.language ||
      [...(code?.classList ?? [])].find((name) => name.startsWith('language-'))?.slice(9) ||
      'text'
    const lines = pre.querySelectorAll('.line').length || (code?.textContent ?? '').split('\n').length
    const frame = document.createElement('div')
    frame.className = 'ap-code'
    const head = document.createElement('div')
    head.className = 'ap-code__bar'
    head.innerHTML = '<span class="ap-code__lang"></span><span class="ap-code__lines"></span><button class="ap-code__copy" type="button"></button>'
    head.querySelector('.ap-code__lang').textContent = lang
    head.querySelector('.ap-code__lines').textContent = `${String(lines).padStart(3, '0')} LN`
    const button = head.querySelector('.ap-code__copy')
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
    frame.append(head, pre)
  }
}

decorateCode()
document.addEventListener('dxbe:unlocked', decorateCode)

/* ---------- reveal on enter ---------- */

const reveals = document.querySelectorAll('[data-reveal]')
if (motion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        observer.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -6% 0px' },
  )
  for (const node of reveals) observer.observe(node)
} else {
  for (const node of reveals) node.classList.add('is-in')
}

/* code frames change heading offsets */
measure()
update()
