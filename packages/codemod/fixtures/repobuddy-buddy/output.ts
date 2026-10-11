// Mirrors repobuddy/buddy: `config: true` loads its plugins, `.optional()` chains and `z.optional(...)`,
// and a `run()` that both logs with `ui.info` and returns the report.
import { CliError, cli, command, exitCodes, t } from 'clibuilder'

export const testScripts = command({
	name: 'test-scripts',
	description: 'Add or adjust the test scripts.',
	options: {
		cwd: {
			description: 'project directory',
			type: t.string().optional(),
		},
		runner: {
			description: 'the test runner to write scripts for',
			type: t.enum(['jest', 'vitest']).optional(),
		},
	},
	async run({ cwd, runner }) {
		this.ui.info(`writing scripts for ${runner ?? 'detected runner'} in ${cwd ?? this.cwd}`)
	},
})

export const checkDependenciesCommand = command({
	name: 'check-deps',
	alias: ['check-dependencies'],
	description: 'Report packages the jest config uses that package.json does not declare',
	options: {
		cwd: {
			description: 'The project to check. Defaults to the current directory.',
			type: t.string().optional(),
		},
	},
	async run(args) {
		const cwd = args.cwd ?? this.cwd
		const report = { missing: [] as string[], summary: `checked ${cwd}` }
		if (report.missing.length === 0) {
			this.ui.info(report.summary)
			return report
		}
		throw new CliError(report.summary, { exitCode: exitCodes.error })
	},
})

export const app = cli({
	name: 'repobuddy',
	version: '1.0.0',
	description: 'Your repo buddy',
	// Load-bearing: this is how clibuilder finds the plugin commands other packages contribute.
	// TODO(clibuilder-12): clibuilder 12 no longer loads plugins from `config`. If this CLI loads plugins, `.use(plugins())` from '@clibuilder/plugins' is required: add it and the dependency, or rerun the codemod with `--add-plugins`.
	config: true,
})
	.command(testScripts)
	.command(checkDependenciesCommand)
