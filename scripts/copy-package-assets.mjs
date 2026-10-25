import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const dist = path.join(root, 'dist')
const themes = ['folio', 'orbital', 'scholar', 'apogee', 'capstan']

await rm(path.join(dist, '.nojekyll'), { force: true })
await rm(path.join(dist, 'pagefind'), { recursive: true, force: true })

for (const theme of themes) {
  const source = path.join(root, 'themes', theme)
  const destination = path.join(dist, 'themes', theme)
  const rawManifest = JSON.parse(await readFile(path.join(source, 'theme.json'), 'utf8'))
  await mkdir(destination, { recursive: true })
  await writeFile(
    path.join(destination, 'theme.json'),
    `${JSON.stringify({ ...rawManifest, entry: './theme.js' }, null, 2)}\n`,
    'utf8',
  )
  await cp(path.join(source, 'assets'), path.join(destination, 'assets'), {
    recursive: true,
  })
  await cp(path.join(source, 'i18n'), path.join(destination, 'i18n'), {
    recursive: true,
  })
}

await mkdir(path.join(dist, 'src', 'assets'), { recursive: true })
for (const asset of ['search.js', 'favicon.svg', 'unlock.js']) {
  await cp(path.join(root, 'src', 'assets', asset), path.join(dist, 'src', 'assets', asset))
}
