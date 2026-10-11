import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const bin = fileURLToPath(new URL('./axi.mjs', import.meta.url))
const cwd = fileURLToPath(new URL('.', import.meta.url))

/**
 * Runs the real bin in its own process, as a user would.
 */
function run(...args) {
	const r = spawnSync(process.execPath, [bin, ...args], {
		cwd,
		encoding: 'utf8',
		env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: undefined }
	})
	return { code: r.status, stdout: r.stdout, stderr: r.stderr }
}

test('a usage error is one coded error on stdout, exit 2, nothing on stderr', () => {
	const r = run('show', '1', '--bogus')
	assert.equal(r.code, 2)
	assert.equal(r.stderr, '')
	assert.equal(
		r.stdout,
		[
			'error: unknown option --bogus',
			'code: unknown-option',
			'option: "--bogus"',
			'help[2]: "Usage: axi-cli show <arguments> [options]","valid options for `show`: --port, --priority (--help always allowed)"',
			''
		].join('\n')
	)
})

test('only the top-ranked error is reported, in the requested format', () => {
	const r = run('show', '--priority', 'urgent', '--port', '0', '--format', 'json')
	assert.equal(r.code, 2)
	assert.equal(r.stderr, '')
	assert.deepEqual(JSON.parse(r.stdout), {
		error: 'invalid value for option --port: expected an integer from 1 to 65535, received "0"',
		code: 'invalid-value',
		option: '--port',
		value: '0',
		help: ['Usage: axi-cli show <arguments> [options]', 'expected for --port: int 1..65535 (received "0")']
	})
})

test('an invalid enum value lists the allowed values', () => {
	const r = run('show', '1', '--priority', 'urgent', '--format', 'json')
	assert.equal(r.code, 2)
	assert.deepEqual(JSON.parse(r.stdout).help, [
		'Usage: axi-cli show <arguments> [options]',
		'allowed for --priority: low, normal, high (received "urgent")'
	])
})

test('a bare group is a missing-command error listing its sub-commands, without the full help', () => {
	const r = run('task', '--format', 'json')
	assert.equal(r.code, 2)
	assert.equal(r.stderr, '')
	assert.deepEqual(JSON.parse(r.stdout), {
		error: 'missing command for `axi-cli task`',
		code: 'missing-command',
		command: 'axi-cli task',
		help: ['Usage: axi-cli task <command>', 'valid commands for `axi-cli task`: add, remove']
	})
})

test('a well-formed invocation runs', () => {
	const r = run('show', '7', '--format', 'json')
	assert.deepEqual({ code: r.code, stdout: r.stdout, stderr: r.stderr }, { code: 0, stdout: '{"id":7}\n', stderr: '' })
})

test('a config failing the schema is an invalid-config error on stdout, exit 1, without the help', () => {
	// axi-cli.json next to this file holds { "port": "x" }
	const r = run('serve', '--format', 'json')
	assert.equal(r.code, 1)
	assert.equal(r.stderr, '')
	assert.deepEqual(JSON.parse(r.stdout), {
		error: 'config fails validation',
		code: 'invalid-config',
		port: ['Expected number, received string']
	})
})
