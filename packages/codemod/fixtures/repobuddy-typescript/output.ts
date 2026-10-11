// Mirrors repobuddy/typescript: a `z.union` of `z.literal`s, and `z.optional(...)`.
import { command, t } from 'clibuilder'

export const build = command({
	name: 'build',
	arguments: [
		{
			name: 'type',
			description: 'type of build: cjs, esm, or tslib',
			type: t.enum(['cjs', 'tslib', 'esm']),
		},
	],
	async run({ type }) {
		this.ui.info(`building ${type}...`)
	},
})

export const copyCjsPackageJson = command({
	name: 'copy-cjs-package-json',
	arguments: [
		{ name: 'source', description: 'source file', type: t.string() },
		{ name: 'target', description: 'target folder', type: t.string().optional() },
	],
	run: ({ source, target }) => ({ source, target }),
})
