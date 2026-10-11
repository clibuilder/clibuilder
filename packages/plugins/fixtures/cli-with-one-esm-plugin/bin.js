const { cli } = require('clibuilder')
const { config } = require('clibuilder/config')
const { plugins } = require('@clibuilder/plugins')

const app = cli({
	name: 'test-cli',
	version: '1.0.0'
})
	.use(config())
	.use(plugins())

app.parse(process.argv)
