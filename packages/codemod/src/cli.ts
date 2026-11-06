import fs from 'node:fs'
import path from 'node:path'
import { CliError, cli, document, empty, result, t } from 'clibuilder'
import { fullOption, orEmpty, truncateList } from 'clibuilder/axi'
import { codemod, formatReport } from './run.js'

const guide = 'https://clibuilder.github.io/clibuilder/guides/upgrade-to-12/'
const findingsLimit = 30

export namespace codemodCli {
	export type Options = {
		/** The directory the patterns resolve against. Defaults to `process.cwd()`. */
		cwd?: string | undefined
		/** Where the cli writes. Defaults to `process.stdout` and `process.stderr`. */
		streams?: { stdout: NodeJS.WritableStream; stderr: NodeJS.WritableStream } | undefined
	}
}

/** Builds the `clibuilder-codemod` cli on clibuilder itself, so it answers the way every clibuilder 12 command does. */
export function codemodCli(options: codemodCli.Options = {}) {
	return cli({
		name: 'clibuilder-codemod',
		version: readVersion(),
		description: 'Upgrades a clibuilder 11 CLI to clibuilder 12',
		...(options.streams ? { streams: options.streams } : {})
	}).default({
		description:
			'Rewrites zod to t and moves imports, flags what it cannot rewrite with a TODO(clibuilder-12) comment, and lists returned values that clibuilder 12 prints',
		arguments: [
			{
				name: 'patterns',
				description: 'Files, directories or globs of your CLI source',
				type: t.array(t.string())
			}
		],
		options: {
			'dry-run': { description: 'Print a unified diff instead of writing files' },
			'diff-file': {
				description:
					'With --dry-run, write the diff to this file and print the findings on stdout, instead of the diff on stdout and the report on stderr',
				type: t.string().optional()
			},
			'add-plugins': { description: 'Add .use(plugins()) to every cli() that sets config' },
			full: fullOption
		},
		examples: [
			{ command: 'clibuilder-codemod --dry-run src', description: 'Print the diff, write nothing' },
			{ command: 'clibuilder-codemod src', description: 'Upgrade every file under src' }
		],
		run(args) {
			const patterns = args.patterns as string[]
			const dryRun = !!args['dry-run']
			const diffFile = args['diff-file'] as string | undefined
			const cwd = options.cwd ?? process.cwd()
			if (diffFile !== undefined && !dryRun) {
				throw new CliError('--diff-file needs --dry-run', {
					code: 'diff-file-needs-dry-run',
					exitCode: 2,
					help: ['Add --dry-run, or drop --diff-file to write the changes to the files']
				})
			}
			const missing = patterns.filter((p) => !/[*?{[]/.test(p) && !fs.existsSync(path.resolve(cwd, p)))
			if (missing.length > 0) {
				throw new CliError(`${missing.length} path(s) do not exist`, {
					code: 'path-not-found',
					exitCode: 1,
					details: { paths: missing },
					help: ['Nothing was written. Check the spelling and the directory you run it from, then run it again']
				})
			}
			const data = codemod({
				patterns,
				cwd,
				dryRun,
				addPlugins: !!args['add-plugins']
			})
			const { summary } = data
			if (summary.scanned === 0) {
				return empty(`0 files matched: ${patterns.join(' ')}`, {
					help: 'Pass the files, directories or globs of your CLI source, such as `clibuilder-codemod src`'
				})
			}
			if (data.failures.length > 0) {
				throw new CliError(`${data.failures.length} file(s) could not be read or parsed`, {
					code: 'unreadable-files',
					exitCode: 1,
					details: {
						files: data.failures.map((f) => `${f.file}: ${f.message.split('\n')[0]}`),
						changed: summary.changed
					},
					help: [
						dryRun
							? 'Nothing was written. Fix or exclude the listed files, then run it again'
							: `${summary.changed === 0 ? 'No other file was' : summary.changed === 1 ? '1 other file was' : `${summary.changed} other files were`} changed. Fix or exclude the listed files, then run it again`
					]
				})
			}
			if (dryRun && diffFile === undefined) {
				this.ui.info(formatReport(data, true).replace(/\n$/, ''))
				if (data.diff === '') return empty('0 files would change')
				return document(data.diff)
			}

			if (diffFile !== undefined && data.diff !== '') fs.writeFileSync(path.resolve(cwd, diffFile), data.diff)
			const listed = data.findings.filter((f) => f.kind !== 'rewrite')
			const rows = listed.map((f) => ({
				at: `${f.file}:${f.line}:${f.column}`,
				kind: f.kind,
				rule: f.rule,
				message: f.message
			}))
			const shown = truncateList(rows, { limit: findingsLimit, full: !!args.full })
			const help: string[] = []
			if (shown.truncated) {
				help.push(`Run \`clibuilder-codemod ${patterns.map(quote).join(' ')} --full\` to list every finding`)
			}
			if (summary.flagged > 0) {
				help.push(`Search for \`TODO(clibuilder-12)\` and fix each one by hand; see ${guide}`)
			}
			if (summary.review > 0) {
				help.push('Review each printed return and keep it when the value is the answer')
			}
			if (diffFile !== undefined && data.diff !== '') help.push(`Apply the diff with \`git apply ${quote(diffFile)}\``)
			if (data.dependencies.length > 0) help.push("Run your package manager's install")
			return result(
				{
					scanned: summary.scanned,
					changed: summary.changed,
					rewritten: summary.rewritten,
					flagged: summary.flagged,
					review: summary.review,
					findings: orEmpty(shown.items, '0 findings to fix by hand'),
					...(shown.truncated ? { count: shown.count } : {}),
					...(data.dependencies.length > 0
						? { dependencies: data.dependencies.map((d) => ({ file: d.file, added: d.names.join(' ') })) }
						: {})
				},
				{ help, render: { text: () => formatReport(data, false) } }
			)
		}
	})
}

function quote(value: string) {
	return /^[\w@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`
}

function readVersion(): string {
	const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
	return pkg.version
}
