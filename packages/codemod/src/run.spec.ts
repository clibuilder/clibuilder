import fs, { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { unifiedDiff } from './diff.js'
import { expandPatterns } from './files.js'
import { addDependencies, findPackageJson } from './package_json.js'
import { runCodemod } from './run.js'

const fixtures = join(import.meta.dirname, '../fixtures')

function project() {
	const dir = mkdtempSync(join(tmpdir(), 'clibuilder-codemod-'))
	writeFileSync(
		join(dir, 'package.json'),
		'{\n  "name": "app",\n  "dependencies": {\n    "clibuilder": "^11.5.0"\n  }\n}\n'
	)
	mkdirSync(join(dir, 'src'))
	cpSync(join(fixtures, 'repobuddy-buddy/input.ts'), join(dir, 'src/app.ts'))
	cpSync(join(fixtures, 'repobuddy-typescript/input.ts'), join(dir, 'src/build.ts'))
	writeFileSync(join(dir, 'src/other.ts'), 'export const a = 1\n')
	return dir
}

function capture() {
	let text = ''
	return {
		write(chunk: string) {
			text += chunk
		},
		get text() {
			return text
		}
	}
}

describe('runCodemod', () => {
	it('prints a diff and the report with --dry-run, and writes nothing', () => {
		const cwd = project()
		const stdout = capture()
		const stderr = capture()
		const summary = runCodemod({ patterns: ['src'], cwd, dryRun: true, addPlugins: true, stdout, stderr })

		expect(summary).toEqual({ scanned: 3, changed: 2, rewritten: 9, flagged: 0, review: 2, failed: 0 })
		expect(stdout.text).toContain('--- a/src/app.ts\n+++ b/src/app.ts\n')
		expect(stdout.text).toContain("-import { CliError, cli, command, exitCodes, z } from 'clibuilder'\n")
		expect(stdout.text).toContain('+    "@clibuilder/plugins": "^0.2.0",')
		expect(stderr.text).toContain('src/app.ts\n  5 rewrite(s)\n  38:11    review  printed-return `return report`')
		expect(stderr.text).toContain('3 file(s) scanned, 2 would change.')
		expect(readFileSync(join(cwd, 'src/app.ts'), 'utf8')).toBe(
			readFileSync(join(fixtures, 'repobuddy-buddy/input.ts'), 'utf8')
		)
	})

	it('writes the files and the package.json, and reports on stdout', () => {
		const cwd = project()
		const stdout = capture()
		const stderr = capture()
		runCodemod({ patterns: ['src/*.ts'], cwd, addPlugins: true, stdout, stderr })

		expect(readFileSync(join(cwd, 'src/build.ts'), 'utf8')).toBe(
			readFileSync(join(fixtures, 'repobuddy-typescript/output.ts'), 'utf8')
		)
		expect(JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8')).dependencies).toEqual({
			'@clibuilder/plugins': '^0.2.0',
			clibuilder: '^11.5.0'
		})
		expect(stdout.text).toContain('package.json\n  rewrite  added @clibuilder/plugins to dependencies')
		expect(stdout.text).toContain('3 file(s) scanned, 2 changed.')
		expect(stdout.text).toContain('upgrade-to-12')
		expect(stderr.text).toBe('')

		const again = capture()
		const summary = runCodemod({ patterns: ['src'], cwd, addPlugins: true, stdout: again, stderr })
		expect(summary.changed).toBe(0)
	})

	it('reports a file it cannot read and counts it as failed', () => {
		const cwd = project()
		const stdout = capture()
		const summary = runCodemod({ patterns: ['src/missing.ts'], cwd, stdout, stderr: capture() })
		expect(summary.failed).toBe(1)
		expect(stdout.text).toContain('src/missing.ts\n  error: ')
		expect(stdout.text).toContain('1 file(s) could not be read or parsed.')
	})
})

describe('expandPatterns', () => {
	it('walks a directory for source files, skipping node_modules, build output, dot folders and .d.ts', () => {
		const dir = mkdtempSync(join(tmpdir(), 'clibuilder-codemod-'))
		for (const file of [
			'a.ts',
			'b.mjs',
			'c.d.ts',
			'd.json',
			'node_modules/x.ts',
			'esm/y.js',
			'.git/z.ts',
			'sub/e.tsx'
		]) {
			mkdirSync(join(dir, file, '..'), { recursive: true })
			writeFileSync(join(dir, file), '')
		}
		expect(expandPatterns(['.'], dir)).toEqual([join(dir, 'a.ts'), join(dir, 'b.mjs'), join(dir, 'sub/e.tsx')])
		expect(expandPatterns(['**/*.ts'], dir)).toEqual([join(dir, 'a.ts')])
	})
})

describe('expandPatterns on Node.js before 22', () => {
	it('asks for the shell to expand a glob', () => {
		const original = fs.globSync
		// @ts-expect-error simulate a Node.js without fs.globSync
		delete fs.globSync
		try {
			expect(() => expandPatterns(['src/*.ts'], '.')).toThrow('Globs need Node.js 22 or newer')
		} finally {
			fs.globSync = original
		}
	})
})

describe('addDependencies', () => {
	it('adds a missing dependency, sorted, keeping tabs', () => {
		const text = '{\n\t"dependencies": { "zz": "1" }\n}'
		expect(addDependencies(text, ['@clibuilder/plugins', 'other'])).toBe(
			'{\n\t"dependencies": {\n\t\t"@clibuilder/plugins": "^0.2.0",\n\t\t"other": "*",\n\t\t"zz": "1"\n\t}\n}'
		)
	})

	it('leaves a package.json that lists the dependency in any field', () => {
		const text = '{ "devDependencies": { "@clibuilder/plugins": "^0.1.0" } }\n'
		expect(addDependencies(text, ['@clibuilder/plugins'])).toBe(text)
	})

	it('finds the nearest package.json, or none', () => {
		expect(findPackageJson(import.meta.dirname)).toBe(join(import.meta.dirname, '../package.json'))
		expect(findPackageJson('/')).toBeUndefined()
	})
})

describe('unifiedDiff', () => {
	it('is empty for equal texts', () => {
		expect(unifiedDiff('a.ts', 'x\n', 'x\n')).toBe('')
	})

	it('prints hunks with three lines of context and merges close changes', () => {
		const before = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n')
		const after = before
			.replace('line 2\n', 'line two\n')
			.replace('line 6\n', 'line six\n')
			.replace('line 18', 'eighteen')
		expect(unifiedDiff('a.ts', before, after)).toBe(
			[
				'--- a/a.ts',
				'+++ b/a.ts',
				'@@ -1,9 +1,9 @@',
				' line 1',
				'-line 2',
				'+line two',
				' line 3',
				' line 4',
				' line 5',
				'-line 6',
				'+line six',
				' line 7',
				' line 8',
				' line 9',
				'@@ -15,6 +15,6 @@',
				' line 15',
				' line 16',
				' line 17',
				'-line 18',
				'+eighteen',
				' line 19',
				' line 20',
				''
			].join('\n')
		)
	})

	it('numbers a pure insertion and a pure deletion', () => {
		expect(unifiedDiff('a.ts', 'a', 'b\na')).toBe('--- a/a.ts\n+++ b/a.ts\n@@ -1 +1,2 @@\n+b\n a\n')
		expect(unifiedDiff('a.ts', '', 'a')).toBe('--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-\n+a\n')
		expect(unifiedDiff('a.ts', 'a\nb', 'a')).toBe('--- a/a.ts\n+++ b/a.ts\n@@ -1,2 +1 @@\n a\n-b\n')
	})
})
