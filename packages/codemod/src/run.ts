import fs from 'node:fs'
import path from 'node:path'
import type { Finding } from './context.js'
import { unifiedDiff } from './diff.js'
import { expandPatterns } from './files.js'
import { addDependencies, findPackageJson } from './package_json.js'
import { transform } from './transform.js'

export namespace runCodemod {
	export type Options = {
		readonly patterns: readonly string[]
		readonly cwd: string
		/** Print a unified diff instead of writing the files. */
		readonly dryRun?: boolean | undefined
		readonly addPlugins?: boolean | undefined
		readonly stdout: { write(chunk: string): unknown }
		readonly stderr: { write(chunk: string): unknown }
	}

	export type Summary = {
		readonly scanned: number
		readonly changed: number
		readonly rewritten: number
		readonly flagged: number
		readonly review: number
		readonly failed: number
	}
}

export namespace codemod {
	export type Options = {
		readonly patterns: readonly string[]
		readonly cwd: string
		readonly dryRun?: boolean | undefined
		readonly addPlugins?: boolean | undefined
	}

	export type FileFinding = Finding & { readonly file: string }

	export type Result = {
		readonly summary: runCodemod.Summary
		/** Every finding, rewrites included, in file order. `file` is relative to `cwd`. */
		readonly findings: readonly FileFinding[]
		/** The files that could not be read or parsed. */
		readonly failures: readonly { readonly file: string; readonly message: string }[]
		/** The `package.json` files that got dependencies, and the names added to each. */
		readonly dependencies: readonly { readonly file: string; readonly names: readonly string[] }[]
		/** In dry-run, the unified diff of every change, empty when nothing would change or when writing. */
		readonly diff: string
		/** The report in file order, as `runCodemod` prints it: findings and errors per file, then the dependency notes. */
		readonly report: string
	}
}

/**
 * Scans, transforms and (unless `dryRun`) writes the files `patterns` name, and returns what happened as data.
 */
export function codemod(options: codemod.Options): codemod.Result {
	const { cwd, dryRun = false } = options
	const files = expandPatterns(options.patterns, cwd)
	const dependencies = new Map<string, Set<string>>()
	const summary = { scanned: files.length, changed: 0, rewritten: 0, flagged: 0, review: 0, failed: 0 }
	const findings: codemod.FileFinding[] = []
	const failures: { file: string; message: string }[] = []
	const added: { file: string; names: string[] }[] = []
	let report = ''
	let diff = ''

	for (const file of files) {
		const relative = path.relative(cwd, file).split(path.sep).join('/')
		let source: string
		let result: transform.Result
		try {
			source = fs.readFileSync(file, 'utf8')
			result = transform(source, file, { addPlugins: options.addPlugins })
		} catch (error) {
			summary.failed++
			const message = error instanceof Error ? error.message : String(error)
			failures.push({ file: relative, message })
			report += `${relative}\n  error: ${message}\n`
			continue
		}
		if (result.findings.length > 0) report += formatFindings(relative, result.findings)
		for (const finding of result.findings) {
			findings.push({ ...finding, file: relative })
			if (finding.kind === 'rewrite') summary.rewritten++
			else if (finding.kind === 'flag') summary.flagged++
			else summary.review++
		}
		if (result.output !== source) {
			summary.changed++
			if (dryRun) diff += unifiedDiff(relative, source, result.output)
			else fs.writeFileSync(file, result.output)
		}
		if (result.dependencies.length > 0) {
			const packageJson = findPackageJson(path.dirname(file))
			if (packageJson) {
				const set = dependencies.get(packageJson) ?? new Set<string>()
				for (const name of result.dependencies) set.add(name)
				dependencies.set(packageJson, set)
			}
		}
	}

	for (const [packageJson, names] of dependencies) {
		const before = fs.readFileSync(packageJson, 'utf8')
		const after = addDependencies(before, [...names])
		if (after === before) continue
		const relative = path.relative(cwd, packageJson).split(path.sep).join('/')
		added.push({ file: relative, names: [...names] })
		report += `${relative}\n  rewrite  added ${[...names].join(', ')} to dependencies; run your package manager's install\n`
		if (dryRun) diff += unifiedDiff(relative, before, after)
		else fs.writeFileSync(packageJson, after)
	}

	return { summary, findings, failures, dependencies: added, diff, report }
}

/**
 * Runs the codemod over the files `patterns` name, and prints what it did and what is left to do.
 * With `dryRun`, the changes are printed as a unified diff on stdout and the report goes to stderr.
 */
export function runCodemod(options: runCodemod.Options): runCodemod.Summary {
	const { dryRun = false } = options
	const report = dryRun ? options.stderr : options.stdout
	const result = codemod(options)
	if (result.diff) options.stdout.write(result.diff)
	report.write(formatReport(result, dryRun))
	return result.summary
}

/** The prose report: what `runCodemod` prints. */
export function formatReport(result: codemod.Result, dryRun: boolean) {
	return result.report + formatSummary(result.summary, dryRun)
}

function formatFindings(file: string, findings: readonly Finding[]) {
	const rewrites = findings.filter((f) => f.kind === 'rewrite').length
	const lines = findings
		.filter((f) => f.kind !== 'rewrite')
		.map((f) => `  ${`${f.line}:${f.column}`.padEnd(8)} ${f.kind.padEnd(7)} ${f.rule.padEnd(14)} ${f.message}`)
	if (rewrites > 0) lines.unshift(`  ${rewrites} rewrite(s)`)
	return `${file}\n${lines.join('\n')}\n`
}

function formatSummary(summary: runCodemod.Summary, dryRun: boolean) {
	const verb = dryRun ? 'would change' : 'changed'
	const lines = [
		'',
		`${summary.scanned} file(s) scanned, ${summary.changed} ${verb}.`,
		`${summary.rewritten} rewritten, ${summary.flagged} flagged with a TODO(clibuilder-12) comment, ${summary.review} return(s) to review.`
	]
	if (summary.failed > 0) lines.push(`${summary.failed} file(s) could not be read or parsed.`)
	if (summary.flagged > 0 || summary.review > 0) {
		lines.push('See the upgrade guide: https://clibuilder.github.io/clibuilder/guides/upgrade-to-12/')
	}
	return `${lines.join('\n')}\n`
}
