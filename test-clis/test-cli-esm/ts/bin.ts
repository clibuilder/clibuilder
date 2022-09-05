#!/usr/bin/env node
import { cli } from 'clibuilder'
import { dirname } from 'dirname-filename-esm'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const __dirname = dirname(import.meta)
const pjson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))

const app = cli({
  name: pjson.name,
  version: pjson.verison,
  config: true
}).default({
  run() {
    this.ui.error('some error message')
    this.ui.info('some info message')
  }
}).command({
  name: 'echo',
  arguments: [{ name: 'value', description: 'value to echo back' }],
  run({ value }) {
    this.ui.info(`echoing: ${value}`)
  }
}).command({
  name: 'config-value',
  arguments: [{ name: 'name', description: 'config property name' }],
  run({ name }) {
    this.ui.info(`${name}: ${this.config[name]}`)
  }
})

app.parse(process.argv)
