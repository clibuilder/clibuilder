const { cli } = require('clibuilder')

const app = cli({
  name: 'test-cli',
  version: '1.0.0'
}).loadPlugins(['bad-plugin-no-index'])

app.parse(process.argv)
