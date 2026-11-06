import { enableCompileCache } from 'clibuilder/compile-cache'

enableCompileCache()

// `import` compiles the whole graph before this module runs, so the cache would
// come too late. `await import` keeps clibuilder out of that graph.
const { CliError, cli, document } = await import('clibuilder')
const { config } = await import('clibuilder/config')
const { plugins } = await import('@clibuilder/plugins')
const { pluginsGroup } = await import('./plugins-install.mjs')

const keywords = ['test-cli']

const app = cli({
	name: 'test-cli',
	version: '1.0.0'
})
	// loads the config for the commands and plugins(), and adds `--show-config`
	.use(config())
	.default({
		run() {
			// every ui message is a diagnostic on stderr in the default axi output
			this.ui.error('some error message')
			this.ui.info('some info message')
		}
	})
	.command({
		name: 'echo',
		arguments: [{ name: 'value', description: 'value to echo back' }],
		run({ value }) {
			// the answer is returned, and printed on stdout: verbatim, as a document
			return document(`echoing: ${value}`)
		}
	})
	.command({
		name: 'config-value',
		arguments: [{ name: 'name', description: 'config property name' }],
		run({ name }) {
			if (!this.config) throw new CliError(`cannot read '${name}': no test-cli config found`, { code: 'no-config' })
			// a returned value is printed on stdout in this.format, toon by default
			return { [name]: this.config[name] }
		}
	})
	// the built-in `plugins` group with an `install` sub-command added,
	// so `pnpm cli plugins list`, `search` and `install` are reachable by hand
	.command(pluginsGroup({ name: 'test-cli', keywords }))
	// loads the plugins the config names; `command: false` leaves out the built-in group the line above replaces
	.use(plugins({ keywords, command: false }))

app.parse(process.argv)
