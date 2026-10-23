import { readFile, stat } from 'node:fs/promises'
import { createServer, type Server, type ServerResponse } from 'node:http'
import path from 'node:path'
import { decodePath } from '../shared/url.ts'

const HTML_CONTENT_TYPE = 'text/html; charset=utf-8'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
}

export interface StaticServerOptions {
  root: string
  base: string
  port?: number
  dev?: boolean
}

export interface StaticServer {
  server: Server
  url: string
  port: number
  broadcastReload: () => void
  broadcastError: (message: string) => void
  close: () => Promise<void>
}

function reloadScript(base: string): string {
  return `<script>
(() => {
  if (window.__blogDevReload) return;
  window.__blogDevReload = true;
  const overlay = document.createElement('pre');
  overlay.id = '__dev_error';
  overlay.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;overflow:auto;margin:0;padding:24px;background:#1b1b1b;color:#ffb4b4;font:13px/1.6 ui-monospace,monospace;white-space:pre-wrap';
  document.body.appendChild(overlay);
  const events = new EventSource('${base}/__dev/events');
  window.addEventListener('pagehide', () => events.close(), { once: true });
  events.addEventListener('build-error', (event) => {
    overlay.textContent = event.data || 'Build failed';
    overlay.style.display = 'block';
  });
  events.onmessage = () => location.reload();
})();
</script>`
}

function injectReload(htmlText: string, base: string): string {
  const script = reloadScript(base)
  if (htmlText.includes('</body>')) return htmlText.replace('</body>', `${script}</body>`)
  return `${htmlText}${script}`
}

function send(
  response: ServerResponse,
  status: number,
  body: string | Buffer,
  contentType: string,
): void {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
  })
  response.end(body)
}

async function listen(server: Server, startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 20; port += 1) {
    const listening = await new Promise<boolean>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException): void => {
        server.off('listening', onListening)
        if (error.code === 'EADDRINUSE') resolve(false)
        else reject(error)
      }
      const onListening = (): void => {
        server.off('error', onError)
        resolve(true)
      }
      server.once('error', onError)
      server.once('listening', onListening)
      server.listen(port, '127.0.0.1')
    })
    if (listening) return port
  }
  throw new Error(`No free port between ${startPort} and ${startPort + 19}`)
}

export async function startStaticServer(options: StaticServerOptions): Promise<StaticServer> {
  const root = path.resolve(options.root)
  const base = options.base
  const clients = new Set<ServerResponse>()
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        send(response, 405, 'Method not allowed', 'text/plain; charset=utf-8')
        return
      }

      const url = new URL(request.url ?? '/', 'http://localhost')
      let pathname = decodePath(url.pathname)

      if (base) {
        if (pathname === '/' || pathname === '') {
          response.writeHead(302, { Location: `${base}/` })
          response.end()
          return
        }
        if (pathname !== base && !pathname.startsWith(`${base}/`)) {
          send(response, 404, 'Not found', 'text/plain; charset=utf-8')
          return
        }
        pathname = pathname.slice(base.length) || '/'
      }

      if (options.dev && pathname === '/__dev/events') {
        response.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        })
        response.write('retry: 1000\n\n')
        clients.add(response)
        const cleanup = () => clients.delete(response)
        request.on('close', cleanup)
        response.on('close', cleanup)
        return
      }

      let relative = pathname.replace(/^\/+/, '')
      if (relative === '') relative = 'index.html'
      else if (pathname.endsWith('/')) relative = `${relative}index.html`

      let file = path.resolve(root, relative)
      if (!file.startsWith(`${root}${path.sep}`) && file !== root) {
        send(response, 403, 'Forbidden', 'text/plain; charset=utf-8')
        return
      }

      try {
        const info = await stat(file)
        if (info.isDirectory()) {
          file = path.join(file, 'index.html')
        }
      } catch {
        const notFound = path.join(root, '404.html')
        try {
          let body = await readFile(notFound, 'utf8')
          if (options.dev) body = injectReload(body, base)
          send(response, 404, request.method === 'HEAD' ? '' : body, HTML_CONTENT_TYPE)
        } catch {
          send(response, 404, 'Not found', 'text/plain; charset=utf-8')
        }
        return
      }

      const extension = path.extname(file).toLowerCase()
      const contentType = MIME_TYPES[extension] ?? 'application/octet-stream'
      let body: Buffer | string = await readFile(file)
      if (extension === '.html' && options.dev) {
        body = injectReload(body.toString('utf8'), base)
      }
      send(response, 200, request.method === 'HEAD' ? '' : body, contentType)
    } catch (error) {
      send(
        response,
        500,
        error instanceof Error ? (error.stack ?? error.message) : String(error),
        'text/plain; charset=utf-8',
      )
    }
  })

  const port = await listen(server, options.port ?? 4000)
  const url = `http://localhost:${port}${base}/`

  return {
    server,
    url,
    port,
    broadcastReload: () => {
      for (const client of clients) client.write('data: reload\n\n')
    },
    broadcastError: (message: string) => {
      const data = message.replaceAll('\n', '\ndata: ')
      for (const client of clients) client.write(`event: build-error\ndata: ${data}\n\n`)
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        for (const client of clients) client.end()
        clients.clear()
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  }
}
