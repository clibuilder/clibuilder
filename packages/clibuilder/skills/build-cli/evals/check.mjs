#!/usr/bin/env node
// Decides one build-cli criterion from the source files in the current folder.
// Usage: node check.mjs <C1..C9>. Prints {"criterion","pass","reason"} as JSON; exits 0 on pass, 1 on fail.
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

function walk(dir, re, out = []) {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		if (e.name === 'node_modules' || e.name.startsWith('.')) continue
		const p = join(dir, e.name)
		if (e.isDirectory()) walk(p, re, out)
		else if (re.test(e.name)) out.push({ path: p, text: readFileSync(p, 'utf8') })
	}
	return out
}

const files = walk('.', /\.[mc]?[jt]s$/)
const docs = walk('.', /\.md$/).filter((f) => !/(^|\/)(README|CHANGELOG|AGENTS|CLAUDE)\.md$/i.test(f.path))
const isTest = (f) => /\.(test|spec)\.[mc]?[jt]s$/.test(f.path)
const src = files.filter((f) => !isTest(f))
const tests = files.filter(isTest)
const any = (list, re) => list.some((f) => re.test(f.text))

// command names declared in the source, each `name:` right after `command({` or `.command({`
const commandNames = [
	...new Set(src.flatMap((f) => [...f.text.matchAll(/command\(\s*\{\s*name\s*:\s*['"]([\w-]+)['"]/g)].map((m) => m[1])))
]
const defaultFormatLine = /default format[^\n]*\b(toon|json|text)\b/i
// the spec of a command: a Markdown file that names the command in a heading and states a default format
const specOf = (name) =>
	docs.find((d) => new RegExp(`^#[^\\n]*\\b${name}\\b`, 'm').test(d.text) && defaultFormatLine.test(d.text))
const testsOf = (name) => tests.filter((t) => new RegExp(`\\b${name}\\b`).test(t.text))
const testTitles = (list) =>
	list.flatMap((t) => [...t.text.matchAll(/\b(?:test|it)\(\s*(['"`])(.*?)\1/g)].map((m) => m[2]))
const specIds = (spec) => [...spec.text.matchAll(/^\s*[-*]\s*\*\*(S\d+)\.\*\*/gm)].map((m) => m[1])
const forEachCommand = (fn) => {
	if (commandNames.length === 0) return 'no command found'
	const bad = commandNames.map((n) => fn(n)).filter(Boolean)
	return bad.join('; ')
}

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
	},
	C7: () => forEachCommand((n) => (specOf(n) ? '' : `${n}: no spec naming its default format`)),
	C8: () =>
		forEachCommand((n) => {
			const spec = specOf(n)
			if (!spec) return `${n}: no spec`
			const ids = specIds(spec)
			if (ids.length === 0) return `${n}: spec has no S<n> criteria`
			const titles = testTitles(testsOf(n))
			const missing = ids.filter((id) => !titles.some((t) => t.startsWith(`${id} `) || t === id))
			return missing.length ? `${n}: no test titled ${missing.join(', ')}` : ''
		}),
	C9: () =>
		forEachCommand((n) => {
			const spec = specOf(n)
			if (!spec) return `${n}: no spec`
			const format = spec.text.match(defaultFormatLine)[1].toLowerCase()
			const calls = testsOf(n).flatMap((t) => [
				...t.text.matchAll(new RegExp(`testCommand\\([^,]+,\\s*(['"\`])(${n}\\b[^'"\`]*)\\1`, 'g'))
			])
			if (!calls.some((m) => !m[2].includes('--format'))) return `${n}: no test runs it without --format`
			const assertsFormat =
				format === 'json'
					? testsOf(n).some((t) => /JSON\.parse\(/.test(t.text))
					: testTitles(testsOf(n)).some((t) => new RegExp(`\\b${format}\\b`, 'i').test(t))
			return assertsFormat ? '' : `${n}: no test asserts the ${format} default`
		})
}

const id = process.argv[2]
const reason = checks[id] ? checks[id]() : `unknown criterion ${id}`
// biome-ignore lint/suspicious/noConsole: prints the verdict as JSON
console.log(JSON.stringify({ criterion: id, pass: reason === '', reason }))
process.exit(reason === '' ? 0 : 1)
