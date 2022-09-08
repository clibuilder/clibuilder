const { cli } = require('clibuilder')

const app = cli({
  name: 'test-cli',
  version: '1.0.0',
  config: true
})

app.parse(process.argv)
