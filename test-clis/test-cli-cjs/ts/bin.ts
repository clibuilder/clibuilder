import { cli } from 'clibuilder'

const app = cli({
  name: 'test-cli-cjs',
  version: '1.0.0',
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
