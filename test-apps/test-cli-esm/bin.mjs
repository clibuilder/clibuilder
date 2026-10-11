import { enableCompileCache } from 'clibuilder/compile-cache'

enableCompileCache()

// `import` compiles the whole graph before this module runs, so the cache would
// come too late. `await import` keeps clibuilder out of that graph.
const { CliError, cli } = await import('clibuilder')

const app = cli({
	name: 'test-cli',
	version: '1.0.0',
	// enables the built-in `plugins` command, so `pnpm cli plugins list` and
	// `pnpm cli plugins search` are reachable by hand.
	keywords: ['test-cli']
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
			// the cli declares `keywords` but no `config`, so `this.config` is always undefined.
			// Declaring `config` would also turn on config-driven plugin loading,
			// and the cli would stop being a keywords-only fixture.
			throw new CliError(`cannot read '${name}': test-cli declares no config`, { code: 'no-config' })
		}
	})

app.parse(process.argv)
