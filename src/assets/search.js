(() => {
  const root = document.querySelector('[data-search]')
  if (!root) return
  const input = root.querySelector('[data-search-input]')
  const status = root.querySelector('[data-search-status]')
  const list = root.querySelector('[data-search-results]')
  if (!(input instanceof HTMLInputElement) || !status || !list) return

  const labels = {
    loading: root.dataset.loading || 'Loading...',
    empty: root.dataset.empty || 'No results.',
    error: root.dataset.error || 'Search is unavailable.',
    results: root.dataset.results || '{n} results',
  }
  const lang = root.dataset.lang || ''
  const indexUrl = root.dataset.index || ''
  const searchTimeout = 12_000
  let pagefind
  let pagefindPromise
  let timer

  async function loadPagefind() {
    if (pagefind) return pagefind
    if (!indexUrl) throw new Error('missing search index url')
    pagefindPromise ??= import(new URL(indexUrl, location.href).href).then((module) => {
      pagefind = module
      return module
    })
    return pagefindPromise
  }

  function setStatus(message) {
    status.textContent = message
  }

  function clearResults() {
    list.replaceChildren()
  }

  function withTimeout(promise, ms) {
    let timeout
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`Search timed out after ${ms}ms`)), ms)
      }),
    ]).finally(() => clearTimeout(timeout))
  }

  function renderResults(items) {
    clearResults()
    for (const item of items) {
      const li = document.createElement('li')
      li.className = 'search-result'
      const link = document.createElement('a')
      link.href = item.url
      link.textContent = item.meta?.title || item.url
      const excerpt = document.createElement('p')
      excerpt.className = 'search-excerpt'
      excerpt.innerHTML = item.excerpt || ''
      li.append(link, excerpt)
      list.append(li)
    }
  }

  async function runSearch(query) {
    clearResults()
    if (!query.trim()) {
      setStatus('')
      return
    }
    setStatus(labels.loading)
    try {
      const results = await withTimeout(
        (async () => {
          const search = await loadPagefind()
          if (search.options) {
            await search.options({ excerptLength: 30 })
          }
          const filters = lang ? { filters: { lang } } : undefined
          const response = await search.search(query.trim(), filters)
          return Promise.all(response.results.slice(0, 20).map((result) => result.data()))
        })(),
        searchTimeout,
      )
      renderResults(results)
      setStatus(results.length === 0 ? labels.empty : labels.results.replace('{n}', String(results.length)))
    } catch (error) {
      console.error(error)
      clearResults()
      setStatus(labels.error)
    }
  }

  function updateUrl(query) {
    const url = new URL(location.href)
    if (query.trim()) url.searchParams.set('q', query)
    else url.searchParams.delete('q')
    history.replaceState(null, '', url)
  }

  input.addEventListener('input', () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      updateUrl(input.value)
      void runSearch(input.value)
    }, 150)
  })

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      clearTimeout(timer)
      updateUrl(input.value)
      void runSearch(input.value)
    }
  })

  const initial = new URLSearchParams(location.search).get('q')
  if (initial) {
    input.value = initial
    void runSearch(initial)
  }
})()
