// Verifies the built package the way a consumer sees it: through the package
// name and its `exports` map, in every runtime available on this machine.
// Run after `tsc` (part of `pnpm build`). Node is required; Deno and Bun are
// checked when installed, and required when ARGS_MINUS_RUNTIMES=all (the
// runtimes CI job).
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
const failures = []
const fail = (message) => failures.push(message)

// 1. Every path in `exports` exists.
const entry = pkg.exports['.']
for (const [condition, path] of Object.entries(entry)) {
	if (!existsSync(new URL(path, root))) fail(`exports["."].${condition} points at missing ${path}`)
}

// 2. The shipped JavaScript uses no Node API.
const forbidden = /\b(?:from\s+['"]node:|require\(|process\.|Buffer\b|__dirname|__filename)/
for (const file of readdirSync(new URL('esm/', root))) {
	if (!file.endsWith('.js') || /\.(?:spec|unit)\.js$/.test(file)) continue
	if (forbidden.test(readFileSync(new URL(`esm/${file}`, root), 'utf8'))) fail(`esm/${file} uses a Node-only API`)
}

// 3. Each runtime imports the public API by package name.
const probe = `
import { parseArgs, tokenizeArgs, ParseArgsError } from ${JSON.stringify(pkg.name)}
const r = parseArgs({ args: ['--n', '1', 'x'], options: { n: { type: 'number' } } })
if (r.options.n !== 1 || r._[0] !== 'x' || tokenizeArgs(['--']).length !== 1 || typeof ParseArgsError !== 'function') {
	throw new Error('unexpected result')
}
console.log('ok')
`
const runtimes = [
	['node', ['--input-type=module', '-e', probe]],
	['deno', ['eval', '--ext=js', probe]],
	['bun', ['--eval', probe]]
]
const cwd = fileURLToPath(root)
for (const [name, args] of runtimes) {
	const result = spawnSync(name, args, { cwd, encoding: 'utf8' })
	if (result.error?.code === 'ENOENT') {
		if (name === 'node' || process.env.ARGS_MINUS_RUNTIMES === 'all') fail(`${name} is not installed`)
		else process.stdout.write(`skip ${name} (not installed)` + '\n')
		continue
	}
	if (result.status !== 0 || result.stdout.trim() !== 'ok')
		fail(`${name} could not import the package:\n${result.stderr}`)
	else process.stdout.write(`ok ${name}` + '\n')
}

if (failures.length) {
	process.stderr.write(failures.join('\n') + '\n')
	process.exit(1)
}
