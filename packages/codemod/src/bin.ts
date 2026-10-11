#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { runCodemod } from './run.js'

const usage = `Usage: clibuilder-codemod [options] <path or glob>...

Upgrades a clibuilder 11 CLI to clibuilder 12: rewrites zod to t and moves imports,
flags what it cannot rewrite with a TODO(clibuilder-12) comment, and lists returned
values that clibuilder 12 prints.

Options:
  --dry-run      print a unified diff instead of writing files
  --add-plugins  add .use(plugins()) to every cli() that sets config
  -h, --help     show this help
`

let values: { 'dry-run'?: boolean; 'add-plugins'?: boolean; help?: boolean }
let positionals: string[]
try {
	;({ values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			'dry-run': { type: 'boolean' },
			'add-plugins': { type: 'boolean' },
			help: { type: 'boolean', short: 'h' }
		}
	}))
} catch (error) {
	process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage}`)
	process.exit(2)
}

if (values.help) {
	process.stdout.write(usage)
} else if (positionals.length === 0) {
	process.stderr.write(usage)
	process.exitCode = 2
} else {
	try {
		const summary = runCodemod({
			patterns: positionals,
			cwd: process.cwd(),
			dryRun: values['dry-run'],
			addPlugins: values['add-plugins'],
			stdout: process.stdout,
			stderr: process.stderr
		})
		if (summary.failed > 0) process.exitCode = 1
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
		process.exitCode = 1
	}
}
