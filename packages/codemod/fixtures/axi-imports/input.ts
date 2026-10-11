// `@clibuilder/axi` value helpers move to `clibuilder/axi`; the output, error, format and usage parts
// are built into `clibuilder`.
import { command } from 'clibuilder'
import { createOutput, formatOption, orEmpty, truncateList } from '@clibuilder/axi'
import { collapseHome, exitCodes } from '@clibuilder/axi'
import type { ErrorReport } from '@clibuilder/axi'

export const list = command({
	name: 'list',
	options: { format: formatOption },
	run(args) {
		const output = createOutput(args.format)
		const items = orEmpty(truncateList(['a', 'b'], 10).items, 'nothing here')
		output.result({ items, home: collapseHome('/home/me/x') })
		if (items.length === 0) process.exitCode = exitCodes.success
	},
})

export const report: ErrorReport = { message: 'failed', code: 'failed' }
