const { cli } = require('clibuilder')

const app = cli({
	name: 'test-cli',
	version: '1.0.0',
	config: true
}).default({
	run() {
		return this.ui.info(JSON.stringify(this.config))
	}
})

app.parse(process.argv)
