const { cli, document } = require('clibuilder')

const app = cli({
	name: 'test-cli',
	version: '1.0.0',
	config: true
}).default({
	run() {
		return document(JSON.stringify(this.config))
	}
})

app.parse(process.argv)
