const root = document.documentElement
const storageKey = 'folio-theme'
const toggle = document.querySelector('[data-theme-toggle]')

function syncToggle() {
  if (!(toggle instanceof HTMLButtonElement)) return
  toggle.setAttribute('aria-pressed', root.dataset.theme === 'dark' ? 'true' : 'false')
}

if (toggle instanceof HTMLButtonElement) {
  syncToggle()
  toggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
    root.dataset.theme = next
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // Private mode or blocked storage: the toggle still works for this page.
    }
    syncToggle()
  })
}

const tocLinks = Array.from(document.querySelectorAll('.toc a[href^="#"]'))
if (tocLinks.length > 0) {
  const headingToLink = new Map()
  for (const link of tocLinks) {
    const href = link.getAttribute('href')
    if (!href) continue
    let id = href.slice(1)
    try {
      id = decodeURIComponent(id)
    } catch {
      // Keep the raw fragment.
    }
    const heading = document.getElementById(id)
    if (heading) headingToLink.set(heading, link)
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const active = headingToLink.get(entry.target)
        if (!active) continue
        for (const link of tocLinks) link.classList.remove('is-active')
        active.classList.add('is-active')
      }
    },
    { rootMargin: '0px 0px -70% 0px', threshold: 0 },
  )

  for (const heading of headingToLink.keys()) observer.observe(heading)
}

const rail = document.getElementById('rail')
const menu = document.querySelector('[data-rail-toggle]')

function setRail(open) {
  if (!rail || !(menu instanceof HTMLButtonElement)) return
  rail.toggleAttribute('data-open', open)
  menu.setAttribute('aria-expanded', String(open))
}

menu?.addEventListener('click', () => setRail(!rail?.hasAttribute('data-open')))
document.querySelector('[data-rail-close]')?.addEventListener('click', () => setRail(false))
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setRail(false)
})

const progress = document.querySelector('[data-progress]')
if (progress instanceof HTMLElement) {
  let queued = false
  const paint = () => {
    queued = false
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    progress.style.setProperty('--p', Math.min(1, Math.max(0, window.scrollY / max)).toFixed(4))
  }
  const schedule = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(paint)
  }
  paint()
  window.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
}
