import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CliError, ref, result, runScript } from '../axi.js'
import { shellQuote } from '../render/ref.js'
import { readScriptData, type ScriptData, scriptGlobal, scriptResolver } from './refs.js'

// the header `universal-plugin plugin build` writes, from `composeScript()` in cyberuni/universal-plugin
const fixture = JSON.parse(
	'{"package":"cyber-asana","bin":"cyber-asana","version":"1.4.0","entry":"skills/asana/scripts/task-list.mjs","commands":{"task get":"skills/asana/scripts/task-get.mjs","task list":"skills/asana/scripts/task-list.mjs"}}'
) as ScriptData

function plugin() {
	const root = mkdtempSync(join(tmpdir(), 'clibuilder-refs-'))
	mkdirSync(join(root, 'skills/asana/scripts'), { recursive: true })
	writeFileSync(join(root, fixture.entry), '')
	writeFileSync(join(root, 'skills/asana/scripts/task-get.mjs'), '')
	return root
}

function streams() {
	const out: string[] = []
	return { out, streams: { stdout: { write: (s: string) => out.push(s) }, stderr: { write: () => {} } } }
}

describe('readScriptData()', () => {
	it('reads the universal-plugin header shape', () => {
		expect(readScriptData(fixture)).toBe(fixture)
	})

	it.each([
		undefined,
		null,
		'x',
		{ ...fixture, entry: 1 },
		{ ...fixture, commands: null },
		{ ...fixture, bin: 1 }
	])('ignores %j', (value) => {
		expect(readScriptData(value)).toBeUndefined()
	})

	it(`reads globalThis.${scriptGlobal} by default`, () => {
		;(globalThis as any)[scriptGlobal] = fixture
		try {
			expect(readScriptData()).toBe(fixture)
		} finally {
			delete (globalThis as any)[scriptGlobal]
		}
	})
})

describe('scriptResolver()', () => {
	it('renders a bundled target as node and its real path, through a link', () => {
		const root = plugin()
		const linked = join(mkdtempSync(join(tmpdir(), 'clibuilder-link-')), 'asana')
		symlinkSync(join(root, 'skills/asana'), linked, 'junction')
		const resolve = scriptResolver(fixture, { script: join(linked, 'scripts/task-list.mjs'), cwd: root })
		const target = realpathSync(join(root, 'skills/asana/scripts/task-get.mjs'))
		expect(resolve(ref('task get', { gid: '1' }))).toBe(`node ${shellQuote(target)} --gid 1`)
	})

	it('renders an unbundled target with pnpm exec when the bin is installed', () => {
		const root = plugin()
		mkdirSync(join(root, 'node_modules/.bin'), { recursive: true })
		writeFileSync(join(root, 'node_modules/.bin/cyber-asana'), '')
		const cwd = join(root, 'skills')
		const resolve = scriptResolver(fixture, { script: join(root, fixture.entry), cwd })
		expect(resolve(ref('project list', { all: true }))).toBe('pnpm exec cyber-asana project list --all')
	})

	it('falls back to a pinned npx', () => {
		const root = plugin()
		const resolve = scriptResolver(fixture, { script: join(root, fixture.entry), cwd: root })
		expect(resolve(ref('project list'))).toBe('npx cyber-asana@1.4.0 project list')
	})

	it('falls back when the running script is unknown', () => {
		const resolve = scriptResolver(fixture, { script: '', cwd: tmpdir() })
		expect(resolve(ref('task get'))).toBe('npx cyber-asana@1.4.0 task get')
	})

	it('falls back when the running script is elsewhere', () => {
		const root = plugin()
		const resolve = scriptResolver(fixture, { script: join(root, 'other.mjs'), cwd: tmpdir() })
		writeFileSync(join(root, 'other.mjs'), '')
		expect(resolve(ref('task get'))).toBe('npx cyber-asana@1.4.0 task get')
	})

	it('falls back when the script is not where the entry says', () => {
		const resolve = scriptResolver(fixture, { script: '/nowhere/else.mjs', cwd: tmpdir() })
		expect(resolve(ref('task get'))).toBe('npx cyber-asana@1.4.0 task get')
	})

	it('renders nothing without script data, or without a package to fall back to', () => {
		expect(scriptResolver(undefined)(ref('task get'))).toBeUndefined()
		const resolve = scriptResolver({ ...fixture, bin: null, package: null }, { script: undefined, cwd: tmpdir() })
		expect(resolve(ref('project list'))).toBeUndefined()
	})
})

describe('runScript() with refs', () => {
	const commands: ScriptData = { ...fixture, commands: {} }

	it('renders refs as help strings from the commands option', async () => {
		const s = streams()
		await runScript(
			{ run: () => result({ id: 1 }, { help: ref('task get', { gid: '1' }, 'see it') }) },
			{
				argv: [],
				streams: s.streams,
				commands
			}
		)
		expect(s.out.join('')).toBe('id: 1\nhelp[1]: Run `npx cyber-asana@1.4.0 task get --gid 1` to see it\n')
	})

	it("encodes next with refs: 'next', and keeps help on a CliError", async () => {
		const s = streams()
		await runScript(
			{ run: () => result({ id: 1 }, { help: ref('task get', {}, 'see it') }) },
			{
				argv: ['--format', 'json'],
				streams: s.streams,
				commands,
				refs: 'next'
			}
		)
		expect(s.out.join('')).toBe('{"id":1,"next":[{"run":"npx cyber-asana@1.4.0 task get","why":"see it"}]}\n')

		const e = streams()
		await runScript(
			{
				run() {
					throw new CliError('gone', { help: ref('task get') })
				}
			},
			{ argv: ['--format', 'json'], streams: e.streams, commands, refs: 'next' }
		)
		expect(e.out.join('')).toBe('{"error":"gone","code":"error","help":["Run `npx cyber-asana@1.4.0 task get`"]}\n')
	})

	it('leaves a ref out without a command map', async () => {
		const s = streams()
		await runScript(
			{ run: () => result({ id: 1 }, { help: ['plain', ref('task get')] }) },
			{
				argv: [],
				streams: s.streams
			}
		)
		expect(s.out.join('')).toBe('id: 1\nhelp[1]: plain\n')
	})
})
