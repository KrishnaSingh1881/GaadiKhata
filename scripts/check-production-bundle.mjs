import {readdir,readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'

const files=(await readdir('dist/assets')).filter(name=>name.endsWith('.js'))
const source=(await Promise.all(files.map(name=>readFile(`dist/assets/${name}`,'utf8')))).join('\n')
for(const marker of ['sample-trip-1','Ramesh Constructions','gaadihisaab-interactive-v1','Reset sample data','Login bypassed','local-admin','/__local','SQLite test','Sai Builders','Test Fuel Station','local-workspace-changed']) {
  assert.ok(!source.includes(marker),`Non-production content leaked into the production bundle: ${marker}`)
}
console.log('Production bundle excludes test authentication, disposable database endpoints and fixture records.')
