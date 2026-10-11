const { cli } = require('clibuilder')
const { plugins } = require('@clibuilder/plugins')

const app = cli({
	name: 'test-cli',
	version: '1.0.0',
	config: true
}).use(plugins())

app.parse(process.argv)
