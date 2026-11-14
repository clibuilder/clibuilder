#!/usr/bin/env node
// Decides one build-cli criterion from the source files in the current folder.
// Usage: node check.mjs <C1..C6>. Prints {"criterion","pass","reason"} as JSON; exits 0 on pass, 1 on fail.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const exportsOf = {
	clibuilder: [
		'CliError',
		'cli',
		'command',
		'createRegistry',
		'defineCollectionKey',
		'defineKey',
		'document',
		'empty',
		'exitCodes',
		'isCliError',
		'isDescriptor',
		'parseArgv',
		'placeholder',
		'ref',
		'result',
		't'
	],
	'clibuilder/axi': [
		'CliError',
		'collapseHome',
		'defaultTextLimit',
		'document',
		'empty',
		'encode',
		'errorOutput',
		'exitCodes',
		'formats',
		'fullOption',
		'homeHeader',
		'isCliError',
		'orEmpty',
		'placeholder',
		'printAnswer',
		'ref',
		'result',
		'runScript',
		'truncateList',
		'truncateText'
	],
	'clibuilder/config': [
		'config',
		'describeConfigSource',
		'getConfigFilenames',
		'getConfigFormat',
		'loadConfig',
		'lookupConfig',
		'readConfigFile',
		'resolveConfig'
	],
	'clibuilder/testing': ['mockExtensionContext', 'mockPluginContext', 'testCommand'],
	'@clibuilder/plugins': ['loadPlugins', 'plugins', 'pluginsCommand']
}

function walk(dir, out = []) {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		if (e.name === 'node_modules' || e.name.startsWith('.')) continue
		const p = join(dir, e.name)
		if (e.isDirectory()) walk(p, out)
		else if (/\.[mc]?[jt]s$/.test(e.name)) out.push({ path: p, text: readFileSync(p, 'utf8') })
	}
	return out
}

const files = walk('.')
const isTest = (f) => /\.(test|spec)\.[mc]?[jt]s$/.test(f.path)
const src = files.filter((f) => !isTest(f))
const tests = files.filter(isTest)
const any = (list, re) => list.some((f) => re.test(f.text))

const checks = {
	C1: () =>
		(any(src, /cli\(\s*\{[^}]*\bname\s*:[^}]*\bversion\s*:/s) ||
			any(src, /cli\(\s*\{[^}]*\bversion\s*:[^}]*\bname\s*:/s)) &&
		any(src, /\.(default|command)\(/) &&
		any(src, /\.parse\(\s*process\.argv\s*\)/)
			? ''
			: 'no cli({ name, version }) ... .parse(process.argv) after .default() or .command()',
	C2: () =>
		any(files, /\brun\s*:\s*(async\s*)?(\([^)]*\)|\w+)\s*=>/)
			? 'a run is an arrow function'
			: any(src, /\b(async\s+)?run\s*\(/)
				? ''
				: 'no run method found',
	C3: () =>
		!any(src, /\bt\.\w+\(/)
			? 'no t builder used'
			: any(src, /\bt\.\w+\([^)]*\)\s*\.(min|max|gte|lte|positive|int)\(/)
				? 'a constraint is chained instead of passed in the builder options'
				: '',
	C4: () =>
		!any(src, /new CliError\([\s\S]*?code\s*:\s*['"][a-z0-9]+(-[a-z0-9]+)*['"]/)
			? 'no CliError with a kebab-case code'
			: any(src, /process\.exit\s*\(/)
				? 'source calls process.exit'
				: '',
	C5: () =>
		any(tests, /import\s*\{[^}]*\btestCommand\b[^}]*\}\s*from\s*['"]clibuilder\/testing['"]/) &&
		any(tests, /\bexitCode\b/)
			? ''
			: 'no test imports testCommand from clibuilder/testing and asserts exitCode',
	C6: () => {
		const bad = []
		let seen = 0
		for (const f of files) {
			for (const m of f.text.matchAll(
				/import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]((?:clibuilder|@clibuilder\/[\w-]+)(?:\/[\w-]+)?)['"]/g
			)) {
				seen++
				const known = exportsOf[m[3]]
				if (!known) {
					bad.push(m[3])
					continue
				}
				if (m[1]) continue
				for (const spec of m[2]
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)) {
					if (spec.startsWith('type ')) continue
					const name = spec.split(/\s+as\s+/)[0]
					if (!known.includes(name)) bad.push(`${name} from ${m[3]}`)
				}
			}
		}
		return seen === 0 ? 'no clibuilder import' : bad.length ? `unknown: ${bad.join(', ')}` : ''
	}
}

const id = process.argv[2]
const reason = checks[id] ? checks[id]() : `unknown criterion ${id}`
// biome-ignore lint/suspicious/noConsole: prints the verdict as JSON
console.log(JSON.stringify({ criterion: id, pass: reason === '', reason }))
process.exit(reason === '' ? 0 : 1)
