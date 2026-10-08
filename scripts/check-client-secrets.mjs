import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve('.next/static')
const files = []
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) await walk(target)
    else if (/\.(js|map)$/.test(entry.name)) files.push(target)
  }
}
await walk(root)
if (!files.length)
  throw new Error('No browser build assets found. Run npm run build first.')
const secretNames = ['TMDB_READ_ACCESS_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY']
const secretValues = secretNames
  .map((name) => process.env[name])
  .filter((value) => value && value.length >= 8)
for (const file of files) {
  const source = await readFile(file, 'utf8')
  for (const secret of [...secretNames, ...secretValues])
    if (source.includes(secret))
      throw new Error(
        `Server-only secret reference found in browser asset: ${path.relative(root, file)}`,
      )
}
console.log(
  `Checked ${files.length} browser assets: no server-only secret names or configured secret values found.`,
)
