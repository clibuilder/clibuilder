// the same kind of cli under `output: 'axi'`, where usage errors are reported by core:
// one ranked, coded error on stdout, exit 2, nothing on stderr (axi-native RFC section 3.3).
const { cli, command, t } = await import('clibuilder')
const { config } = await import('clibuilder/config')
// config takes any Standard Schema: the cli brings its own validator
const { z } = await import('zod')

const app = cli({ name: 'axi-cli', version: '1.0.0', output: 'axi' })
	// `serve` declares config, which needs the config extension
	.use(config())
	.command({
		name: 'show',
		arguments: [{ name: 'id', description: 'the id', type: t.int() }],
		options: {
			port: { type: t.int({ min: 1, max: 65535 }).optional(), description: 'the port' },
			priority: { type: t.enum(['low', 'normal', 'high']).optional(), description: 'the priority' }
		},
		run({ id }) {
			return { id }
		}
	})
	.command({
		name: 'task',
		commands: [command({ name: 'add', run() {} }), command({ name: 'remove', run() {} })]
	})
	.command({
		name: 'serve',
		config: z.object({ port: z.number() }),
		run() {}
	})

app.parse(process.argv)
