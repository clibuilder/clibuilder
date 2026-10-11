// Mirrors repobuddy/typescript: a `z.union` of `z.literal`s, and `z.optional(...)`.
import { command, z } from 'clibuilder'

export const build = command({
	name: 'build',
	arguments: [
		{
			name: 'type',
			description: 'type of build: cjs, esm, or tslib',
			type: z.union([z.literal('cjs'), z.literal('tslib'), z.literal('esm')]),
		},
	],
	async run({ type }) {
		this.ui.info(`building ${type}...`)
	},
})

export const copyCjsPackageJson = command({
	name: 'copy-cjs-package-json',
	arguments: [
		{ name: 'source', description: 'source file', type: z.string() },
		{ name: 'target', description: 'target folder', type: z.optional(z.string()) },
	],
	run: ({ source, target }) => ({ source, target }),
})
