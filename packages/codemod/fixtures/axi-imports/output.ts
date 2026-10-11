// `@clibuilder/axi` value helpers move to `clibuilder/axi`; the output, error, format and usage parts
// are built into `clibuilder`.
import { command } from 'clibuilder'
// TODO(clibuilder-12): `createOutput` from `@clibuilder/axi` has no clibuilder 12 export. Instead, return the value from `run()`, or `result(value, { help, render })`.
// TODO(clibuilder-12): `formatOption` from `@clibuilder/axi` has no clibuilder 12 export. Instead, read the global `--format` from `this.format`.
import { createOutput, formatOption } from '@clibuilder/axi'
import { orEmpty, truncateList } from 'clibuilder/axi'
import { collapseHome, exitCodes } from 'clibuilder/axi'
// TODO(clibuilder-12): `ErrorReport` from `@clibuilder/axi` has no clibuilder 12 export. Instead, throw `new CliError(message, { code, details, help })`, which core renders once.
import type { ErrorReport } from '@clibuilder/axi'

export const list = command({
	name: 'list',
	// TODO(clibuilder-12): clibuilder 12 declares a global `--format <toon|json|text>`, and a command declaring its own `format` option is a startup error. Delete this option and read `this.format`.
	options: { format: formatOption },
	run(args) {
		const output = createOutput(args.format)
		const items = orEmpty(truncateList(['a', 'b'], 10).items, 'nothing here')
		output.result({ items, home: collapseHome('/home/me/x') })
		if (items.length === 0) process.exitCode = exitCodes.success
	},
})

export const report: ErrorReport = { message: 'failed', code: 'failed' }
