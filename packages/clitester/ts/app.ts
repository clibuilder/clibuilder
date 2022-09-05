import { cli } from 'clibuilder'
import path from 'path'
import { readFileSync } from 'fs'

const pjson = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf-8'))

export const app = cli({
  name: 'clitester',
  description: 'Test CLI Application',
  version: pjson.version,
}).default({
  run() {}
})
