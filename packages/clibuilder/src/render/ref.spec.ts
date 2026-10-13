import { empty, printAnswer, result } from './answer.js'
import { isRef, placeholder, ref, refArgs, renderHelp } from './ref.js'

describe('ref()', () => {
	it('keeps the command path with single spaces', () => {
		const r = ref('  task   get ', { gid: 1 }, 'get one task')
		expect(isRef(r)).toBe(true)
		expect(r.path).toBe('task get')
		expect(r.why).toBe('get one task')
	})

	it('rejects an empty path', () => {
		expect(() => ref(' ')).toThrow(TypeError)
	})

	it('is recognized across copies through Symbol.for', () => {
		expect(isRef({ [Symbol.for('clibuilder.ref')]: true, path: 'a', options: {} })).toBe(true)
		expect(isRef('task get')).toBe(false)
	})
})

describe('refArgs()', () => {
	it('renders options as --name value in order, leaving out false and undefined', () => {
		expect(refArgs(ref('x', { a: 1, b: true, c: false, d: undefined, e: ['p', 'q'] }))).toEqual([
			'--a',
			'1',
			'--b',
			'--e',
			'p',
			'--e',
			'q'
		])
	})

	it('single-quotes a value the shell would split or expand', () => {
		expect(refArgs(ref('x', { name: "it's done", path: './a/b.ts', q: '$HOME' }))).toEqual([
			'--name',
			"'it'\\''s done'",
			'--path',
			'./a/b.ts',
			'--q',
			"'$HOME'"
		])
	})

	it('renders a placeholder unquoted, and a literal <name> quoted', () => {
		expect(refArgs(ref('x', { a: placeholder('id'), b: '<id>' }))).toEqual(['--a', '<id>', '--b', "'<id>'"])
	})
})

describe('renderHelp()', () => {
	const lines = ['plain', ref('task get', { gid: 1 }, 'get one task'), ref('task list')]

	it('renders refs as help strings by default, without a cli name', () => {
		expect(renderHelp(lines)).toEqual({
			help: ['plain', 'Run `task get --gid 1` to get one task', 'Run `task list`'],
			next: []
		})
	})

	it("moves refs to next with 'next'", () => {
		expect(renderHelp(lines, (r) => `app ${r.path}`, 'next')).toEqual({
			help: ['plain'],
			next: [
				{ run: 'app task get', why: 'get one task' },
				{ run: 'app task list', why: '' }
			]
		})
	})

	it('drops a ref the resolver cannot run, never printing a bare path', () => {
		expect(renderHelp(lines, () => undefined)).toEqual({ help: ['plain'], next: [] })
	})
})

describe('printAnswer() with refs', () => {
	const resolve = (r: { path: string }) => `app ${r.path}`

	it('keeps the AXI shape by default', () => {
		const answer = result({ id: 1 }, { help: ref('task get', {}, 'see it') })
		expect(printAnswer(answer, 'toon', { resolve })).toBe('id: 1\nhelp[1]: Run `app task get` to see it\n')
	})

	it("encodes next[N]{run,why} after help with refs: 'next'", () => {
		const answer = result({ id: 1 }, { help: ['Pass --full for all', ref('task get', {}, 'see it')] })
		expect(printAnswer(answer, 'toon', { resolve, refs: 'next' })).toBe(
			'id: 1\nhelp[1]: Pass --full for all\nnext[1]{run,why}:\n  app task get,see it\n'
		)
		expect(printAnswer(answer, 'json', { resolve, refs: 'next' })).toBe(
			'{"id":1,"help":["Pass --full for all"],"next":[{"run":"app task get","why":"see it"}]}\n'
		)
	})

	it('leaves help out when every line is a ref', () => {
		const answer = empty('no tasks', { help: [ref('task add', {}, 'add one')] })
		expect(printAnswer(answer, 'json', { resolve, refs: 'next' })).toBe(
			'{"empty":"no tasks","next":[{"run":"app task add","why":"add one"}]}\n'
		)
	})

	it('puts next after a renderer output', () => {
		const answer = result({ id: 1 }, { help: ref('task get'), render: { text: () => 'one task' } })
		expect(printAnswer(answer, 'text', { resolve, refs: 'next' })).toContain('one task\n\nnext')
	})
})
