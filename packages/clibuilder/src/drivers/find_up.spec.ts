import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ctx, findAnyFileUp, findFileUp } from './find_up.js'

const roots: string[] = []

function scaffold() {
	const root = mkdtempSync(join(tmpdir(), 'clibuilder-find-up-'))
	roots.push(root)
	const cwd = join(root, 'a', 'b')
	mkdirSync(cwd, { recursive: true })
	return { root, cwd }
}

/** Two entries differing only in case cannot coexist on a case-insensitive filesystem. */
function fsIsCaseSensitive() {
	const dir = mkdtempSync(join(tmpdir(), 'clibuilder-case-probe-'))
	try {
		writeFileSync(join(dir, 'Probe'), '')
		return !existsSync(join(dir, 'probe'))
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
}

const itOnCaseSensitiveFs = fsIsCaseSensitive() ? it : it.skip
const itAsNonRoot = process.getuid?.() === 0 ? it.skip : it

afterEach(() => {
	ctx.platform = process.platform
})

afterAll(() => {
	for (const root of roots) rmSync(root, { recursive: true, force: true })
})

describe('findFileUp()', () => {
	it('finds the file in the starting directory', () => {
		const { cwd } = scaffold()
		writeFileSync(join(cwd, 'target.txt'), '')

		expect(findFileUp(cwd, 'target.txt')).toEqual(join(cwd, 'target.txt'))
	})

	it('walks up to an ancestor', () => {
		const { root, cwd } = scaffold()
		writeFileSync(join(root, 'target.txt'), '')

		expect(findFileUp(cwd, 'target.txt')).toEqual(join(root, 'target.txt'))
	})

	it('ignores a directory with a matching name', () => {
		const { root, cwd } = scaffold()
		mkdirSync(join(cwd, 'target.txt'))
		writeFileSync(join(root, 'target.txt'), '')

		expect(findFileUp(cwd, 'target.txt')).toEqual(join(root, 'target.txt'))
	})

	it('returns undefined at the filesystem root', () => {
		const { cwd } = scaffold()

		expect(findFileUp(cwd, 'clibuilder-no-such-file-anywhere.txt')).toBeUndefined()
	})

	it('resolves a relative cwd', () => {
		expect(findFileUp('.', 'package.json')).toEqual(join(process.cwd(), 'package.json'))
	})
})

describe('findAnyFileUp()', () => {
	it('picks the nearest directory over the higher priority name', () => {
		const { root, cwd } = scaffold()
		writeFileSync(join(root, 'first.txt'), '')
		writeFileSync(join(cwd, 'second.txt'), '')

		expect(findAnyFileUp(cwd, ['first.txt', 'second.txt'])).toEqual(join(cwd, 'second.txt'))
	})

	it('picks by candidate order within a directory', () => {
		const { cwd } = scaffold()
		writeFileSync(join(cwd, 'first.txt'), '')
		writeFileSync(join(cwd, 'second.txt'), '')

		expect(findAnyFileUp(cwd, ['first.txt', 'second.txt'])).toEqual(join(cwd, 'first.txt'))
	})

	it('skips a candidate that is a directory and keeps looking', () => {
		const { root, cwd } = scaffold()
		mkdirSync(join(cwd, 'first.txt'))
		writeFileSync(join(root, 'second.txt'), '')

		expect(findAnyFileUp(cwd, ['first.txt', 'second.txt'])).toEqual(join(root, 'second.txt'))
	})

	it('follows a symlink pointing at a file', () => {
		const { root, cwd } = scaffold()
		writeFileSync(join(root, 'actual.txt'), '')
		symlinkSync(join(root, 'actual.txt'), join(cwd, 'link.txt'))

		expect(findAnyFileUp(cwd, ['link.txt'])).toEqual(join(cwd, 'link.txt'))
	})

	it('does not follow a symlink pointing at a directory', () => {
		const { root, cwd } = scaffold()
		mkdirSync(join(root, 'actual-dir'))
		symlinkSync(join(root, 'actual-dir'), join(cwd, 'link.txt'))
		writeFileSync(join(root, 'link.txt'), '')

		expect(findAnyFileUp(cwd, ['link.txt'])).toEqual(join(root, 'link.txt'))
	})

	it('skips a broken symlink', () => {
		const { root, cwd } = scaffold()
		symlinkSync(join(root, 'gone.txt'), join(cwd, 'link.txt'))
		writeFileSync(join(root, 'link.txt'), '')

		expect(findAnyFileUp(cwd, ['link.txt'])).toEqual(join(root, 'link.txt'))
	})

	it('returns undefined at the filesystem root', () => {
		const { cwd } = scaffold()

		expect(findAnyFileUp(cwd, ['clibuilder-no-such-file-anywhere.txt'])).toBeUndefined()
	})

	// an unreadable ancestor must not abort the walk
	itAsNonRoot('skips a directory it cannot read', () => {
		const { root } = scaffold()
		const walled = join(root, 'walled')
		const inner = join(walled, 'inner')
		mkdirSync(inner, { recursive: true })
		writeFileSync(join(root, 'target.txt'), '')
		chmodSync(walled, 0o000)
		try {
			expect(findAnyFileUp(inner, ['target.txt'])).toEqual(join(root, 'target.txt'))
		} finally {
			chmodSync(walled, 0o755)
		}
	})

	describe('on a case-insensitive filesystem', () => {
		it('matches a candidate against a differently cased entry', () => {
			ctx.platform = 'darwin'
			const { cwd } = scaffold()
			writeFileSync(join(cwd, 'TARGET.TXT'), '')

			expect(findAnyFileUp(cwd, ['target.txt'])).toEqual(join(cwd, 'TARGET.TXT'))
		})

		it('matches a mixed case candidate against a lower case entry', () => {
			ctx.platform = 'darwin'
			const { cwd } = scaffold()
			writeFileSync(join(cwd, 'target.txt'), '')

			expect(findAnyFileUp(cwd, ['TARGET.txt'])).toEqual(join(cwd, 'target.txt'))
		})

		itOnCaseSensitiveFs('prefers the exactly cased entry', () => {
			ctx.platform = 'win32'
			const { cwd } = scaffold()
			writeFileSync(join(cwd, 'TARGET.TXT'), '')
			writeFileSync(join(cwd, 'target.txt'), '')

			expect(findAnyFileUp(cwd, ['target.txt'])).toEqual(join(cwd, 'target.txt'))
		})
	})

	describe('on a case-sensitive filesystem', () => {
		it('does not match a differently cased entry', () => {
			ctx.platform = 'linux'
			const { cwd } = scaffold()
			writeFileSync(join(cwd, 'TARGET.TXT'), '')

			expect(findAnyFileUp(cwd, ['target.txt'])).toBeUndefined()
		})
	})
})
