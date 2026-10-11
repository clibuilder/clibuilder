require('clibuilder/compile-cache').enableCompileCache()

const { CliError, cli } = require('clibuilder')
const { plugins } = require('@clibuilder/plugins')

const app = cli({
	name: 'test-cli',
	version: '1.0.0',
	config: true
})
	.default({
		run() {
			this.ui.error('some error message')
			this.ui.info('some info message')
		}
	})
	.command({
		name: 'echo',
		arguments: [{ name: 'value', description: 'value to echo back' }],
		run({ value }) {
			this.ui.info(`echoing: ${value}`)
		}
	})
	.command({
		name: 'config-value',
		arguments: [{ name: 'name', description: 'config property name' }],
		run({ name }) {
			if (!this.config) throw new CliError(`cannot read '${name}': no test-cli config found`, { code: 'no-config' })
			this.ui.info(`${name}: ${this.config[name]}`)
		}
	})
	// loads the plugins the config names and adds the `plugins` group,
	// so `pnpm cli plugins list` and `pnpm cli plugins search` are reachable by hand.
	.use(plugins({ keywords: ['test-cli'] }))

app.parse(process.argv)
