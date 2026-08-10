import { execFileSync } from 'node:child_process'
import { globSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const repository = {
	owner: 'clibuilder',
	name: 'clibuilder',
	service: 'github'
}

export function parseLcov(lcov) {
	const lines = new Map()
	let sourceFile

	for (const entry of lcov.split(/\r?\n/)) {
		if (entry.startsWith('SF:')) {
			sourceFile = entry.slice(3)
			continue
		}

		if (!sourceFile || !entry.startsWith('DA:')) continue

		const [lineNumber, hits] = entry.slice(3).split(',')
		if (!lineNumber || hits === undefined) continue

		const key = `${sourceFile}:${lineNumber}`
		lines.set(key, Math.max(lines.get(key) ?? 0, Number(hits)))
	}

	const values = [...lines.values()]
	const hits = values.filter((hits) => hits > 0).length
	return {
		lines: values.length,
		hits,
		coverage: values.length === 0 ? 100 : (hits / values.length) * 100
	}
}

export function formatPercent(coverage) {
	return `${coverage.toFixed(2)}%`
}

function getArgument(name) {
	const index = process.argv.indexOf(name)
	return index === -1 ? undefined : process.argv[index + 1]
}

function getBaseSha() {
	const explicitBase = getArgument('--base')
	if (explicitBase) return explicitBase

	const baseRef = getArgument('--base-ref') ?? 'origin/main'
	return execFileSync('git', ['merge-base', 'HEAD', baseRef], { encoding: 'utf8' }).trim()
}

function readLocalCoverage() {
	const reports = globSync('packages/*/coverage/lcov.info')
	if (reports.length === 0) {
		throw new Error('No LCOV reports found. Run `pnpm coverage` first.')
	}

	return parseLcov(reports.map((report) => readFileSync(report, 'utf8')).join('\n'))
}

async function readCodecovCoverage(baseSha) {
	const url = new URL(
		`https://api.codecov.io/api/v2/${repository.service}/${repository.owner}/repos/${repository.name}/totals/`
	)
	url.searchParams.set('sha', baseSha)

	// biome-ignore lint/suspicious/noUndeclaredEnvVars: this direct CLI input is not a Turbo task dependency.
	const token = process.env.CODECOV_API_TOKEN
	const headers = token ? { Authorization: `Bearer ${token}` } : undefined
	const response = await fetch(url, { headers })
	if (!response.ok) {
		throw new Error(
			`Codecov API request failed (${response.status}). Set CODECOV_API_TOKEN if this repository is private.`
		)
	}

	const body = await response.json()
	if (!body.totals || typeof body.totals.coverage !== 'number') {
		throw new Error(`Codecov has no coverage totals for base commit ${baseSha}.`)
	}

	return body.totals
}

function emit(result) {
	if (getArgument('--format') === 'json') {
		process.stdout.write(`${JSON.stringify(result)}\n`)
		return
	}

	process.stdout.write(
		[
			`Base (${result.baseSha.slice(0, 7)}): ${formatPercent(result.base.coverage)}`,
			`Local: ${formatPercent(result.local.coverage)}`,
			`Delta: ${result.delta >= 0 ? '+' : ''}${result.delta.toFixed(2)}%`,
			result.passed ? 'Coverage comparison passed.' : 'Coverage comparison failed: local coverage dropped.'
		].join('\n') + '\n'
	)
}

export async function main() {
	// biome-ignore lint/suspicious/noUndeclaredEnvVars: this direct CLI input is not a Turbo task dependency.
	const token = process.env.CODECOV_API_TOKEN
	if (!token) {
		process.stderr.write('Warning: CODECOV_API_TOKEN is not set; attempting unauthenticated Codecov API access.\n')
	}

	const baseSha = getBaseSha()
	const [local, base] = await Promise.all([readLocalCoverage(), readCodecovCoverage(baseSha)])
	const delta = local.coverage - base.coverage
	const result = { baseSha, base, local, delta, passed: delta >= 0 }
	emit(result)
	if (!result.passed) process.exitCode = 1
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		process.stderr.write(`${error.message}\n`)
		process.exitCode = 1
	})
}
