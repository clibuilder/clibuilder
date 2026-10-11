import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const bin = fileURLToPath(new URL('./axi.js', import.meta.url))
const cwd = fileURLToPath(new URL('.', import.meta.url))

/**
 * Runs the real axi bin in its own process, as a user would.
 */
function run(...args) {
	const r = spawnSync(process.execPath, [bin, ...args], {
		cwd,
		encoding: 'utf8',
		env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: undefined }
	})
	return { code: r.status, stdout: r.stdout, stderr: r.stderr }
}

test('--help answers the structured help in toon on stdout', () => {
	const r = run('echo', '--help')
	assert.equal(r.code, 0)
	assert.equal(r.stderr, '')
	assert.match(r.stdout, /^name: test-cli echo$/m)
	assert.match(r.stdout, /^examples\[1\]\{command,description\}:$/m)
})

test('--help --format json answers the structured help in json', () => {
	const r = run('echo', '--help', '--format', 'json')
	assert.equal(r.code, 0)
	assert.equal(r.stderr, '')
	const help = JSON.parse(r.stdout)
	assert.equal(help.name, 'test-cli echo')
	assert.deepEqual(help.options[0], {
		name: 'times',
		type: 'int',
		min: 1,
		max: 9,
		required: false,
		default: 1,
		description: 'how many times'
	})
	assert.deepEqual(help.examples, [{ command: 'test-cli echo hi --times 2', description: 'Echo hi twice' }])
})

test('--help --format text answers the text help with its examples', () => {
	const r = run('echo', '--help', '--format', 'text')
	assert.equal(r.code, 0)
	assert.equal(r.stderr, '')
	assert.match(r.stdout, /Usage: test-cli echo <arguments> \[options\]/)
	assert.match(r.stdout, /Examples:\n {2}Echo hi twice\n {4}test-cli echo hi --times 2/)
})

test('--help on the root lists the commands and the global options', () => {
	const help = JSON.parse(run('--help', '--format', 'json').stdout)
	assert.deepEqual(
		help.commands.map((c) => c.name),
		['echo', 'self-help']
	)
	assert.ok(help.globalOptions.some((o) => o.name === 'format'))
})

test('--version answers the plain version, bare and after a command', () => {
	assert.deepEqual(run('--version'), { code: 0, stdout: '1.0.0\n', stderr: '' })
	assert.deepEqual(run('echo', '--version', '--format', 'json'), { code: 0, stdout: '1.0.0\n', stderr: '' })
})

test('ui.showHelp() from run() answers like --help, following --format', () => {
	const r = run('self-help', '--format', 'json')
	assert.equal(r.code, 0)
	assert.equal(r.stderr, '')
	assert.equal(JSON.parse(r.stdout).name, 'test-cli self-help')
})
