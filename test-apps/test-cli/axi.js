// the same cli as `bin.js` under `cli({ output: 'axi' })`, where `--help` and `--version` are answers on stdout.
const { cli, t } = require('clibuilder')

cli({ name: 'test-cli', version: '1.0.0', description: 'axi test cli', output: 'axi' })
	.command({
		name: 'echo',
		description: 'Echo a value',
		arguments: [{ name: 'value', description: 'value to echo back' }],
		options: {
			times: { type: t.int({ min: 1, max: 9 }), description: 'how many times', default: 1 }
		},
		examples: [{ command: 'test-cli echo hi --times 2', description: 'Echo hi twice' }],
		run({ value, times }) {
			return Array(times).fill(value).join(' ')
		}
	})
	.command({
		name: 'self-help',
		description: 'Show its own help',
		run() {
			this.ui.showHelp()
		}
	})
	.parse(process.argv)
