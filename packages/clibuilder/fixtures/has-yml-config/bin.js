const { cli, document } = require('clibuilder')
const { config } = require('clibuilder/config')

const app = cli({
	name: 'show-config',
	version: '1.0.0'
})
	.use(config())
	.default({
		run() {
			return document(JSON.stringify(this.config))
		}
	})

app.parse(process.argv)
