import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Writable } from 'node:stream'
import { codemodCli } from './cli.js'

const fixtures = join(import.meta.dirname, '../fixtures')

function project(extra = 0) {
	const dir = mkdtempSync(join(tmpdir(), 'clibuilder-codemod-cli-'))
	writeFileSync(
		join(dir, 'package.json'),
		'{\n  "name": "app",\n  "dependencies": {\n    "clibuilder": "^11.5.0"\n  }\n}\n'
	)
	mkdirSync(join(dir, 'src'))
	cpSync(join(fixtures, 'repobuddy-buddy/input.ts'), join(dir, 'src/app.ts'))
	for (let i = 0; i < extra; i++) {
		// each file flags one `return report`, to pass the truncation limit
		writeFileSync(
			join(dir, `src/extra${String(i).padStart(2, '0')}.ts`),
			"import { command } from 'clibuilder'\nexport default command({ name: 'x', run() { return 1 } })\n"
		)
	}
	return dir
}

function stream() {
	let text = ''
	const writable = new Writable({
		write(chunk, _encoding, done) {
			text += chunk
			done()
		}
	})
	return {
		writable,
		get text() {
			return text
		}
	}
}

async function run(cwd: string, ...argv: string[]) {
	const stdout = stream()
	const stderr = stream()
	const code = await codemodCli({ cwd, streams: { stdout: stdout.writable, stderr: stderr.writable } }).parse([
		'node',
		'clibuilder-codemod',
		...argv
	])
	return { code, stdout: stdout.text, stderr: stderr.text }
}

describe('clibuilder-codemod cli', () => {
	it('answers in toon by default, with only the findings to act on', async () => {
		const cwd = project()
		const { stdout, stderr } = await run(cwd, 'src', '--add-plugins')
		expect(stderr).toBe('')
		expect(stdout).toContain('scanned: 1\nchanged: 1\nrewritten: 6\nflagged: 0\nreview: 1\n')
		expect(stdout).toContain('findings[1]{at,kind,rule,message}:\n  "src/app.ts:38:11",review,printed-return,')
		expect(stdout).toContain('dependencies[1]{file,added}:\n  package.json,@clibuilder/plugins')
		expect(stdout).toContain('Review each printed return')
		expect(stdout).toContain("Run your package manager's install")
		expect(stdout).not.toContain('TODO(clibuilder-12)')
		expect(readFileSync(join(cwd, 'src/app.ts'), 'utf8')).toContain(
			"import { CliError, cli, command, exitCodes, t } from 'clibuilder'"
		)
	})

	it('answers in json', async () => {
		const { stdout } = await run(project(), 'src', '--format', 'json')
		const answer = JSON.parse(stdout)
		expect(answer).toMatchObject({ scanned: 1, changed: 1, rewritten: 5, flagged: 1, review: 1 })
		expect(answer.findings).toContainEqual(expect.objectContaining({ at: 'src/app.ts:38:11', kind: 'review' }))
	})

	it('prints the prose report with --format text', async () => {
		const { stdout } = await run(project(), 'src', '--format', 'text')
		expect(stdout).toContain('src/app.ts\n  5 rewrite(s)\n  38:11    review  printed-return')
		expect(stdout).toContain('1 file(s) scanned, 1 changed.')
	})

	it('says the zero when nothing is left to fix by hand', async () => {
		const cwd = project()
		writeFileSync(join(cwd, 'src/app.ts'), 'export const a = 1\n')
		const { stdout } = await run(cwd, 'src')
		expect(stdout).toContain('findings: 0 findings to fix by hand')
		expect(stdout).not.toContain('help')
	})

	it('flags with a next step to fix them by hand', async () => {
		const cwd = project()
		writeFileSync(join(cwd, 'src/app.ts'), "import { z } from 'clibuilder'\nexport const a = z.object({})\n")
		const { stdout } = await run(cwd, 'src')
		expect(stdout).toContain('flagged: 2')
		expect(stdout).toContain(
			'Search for `TODO(clibuilder-12)` and fix each one by hand; see https://clibuilder.github.io/clibuilder/guides/upgrade-to-12/'
		)
	})

	it('truncates the findings and lists all of them with --full', async () => {
		const cwd = project(35)
		const truncated = await run(cwd, 'src', '--dry-run')
		expect(truncated.stdout).toContain('--- a/src/app.ts')
		const answer = await run(cwd, 'src', '--add-plugins')
		expect(answer.stdout).toContain('findings[30]{at,kind,rule,message}:')
		expect(answer.stdout).toContain('count: 30 of 36 total')
		expect(answer.stdout).toContain('Run `clibuilder-codemod src --full` to list every finding')

		const full = await run(cwd, 'src', '--add-plugins', '--full')
		expect(full.stdout).toContain('findings[36]{at,kind,rule,message}:')
		expect(full.stdout).not.toContain('count:')
	})

	it('quotes patterns in the --full hint', async () => {
		const cwd = project(35)
		cpSync(join(cwd, 'src'), join(cwd, "it's"), { recursive: true })
		const { stdout } = await run(cwd, 'src/*.ts', "it's", '--add-plugins')
		expect(stdout).toContain("Run `clibuilder-codemod 'src/*.ts' 'it'\\\\''s' --full`")
	})

	it('says nothing matched', async () => {
		const { stdout, code } = await run(project(), 'nothing/*.ts')
		expect(code).toBe('0 files matched: nothing/*.ts')
		expect(stdout).toContain('empty: 0 files matched: nothing/*.ts\n')
		expect(stdout).toContain('such as `clibuilder-codemod src`')
	})

	it('fails with path-not-found and exit 1, before writing any file', async () => {
		const cwd = project()
		const { stdout, stderr, code } = await run(cwd, 'src', 'missing.ts')
		expect(code).toBe(1)
		expect(stderr).toBe('')
		expect(stdout).toContain('error: 1 path(s) do not exist\ncode: path-not-found\npaths[1]: missing.ts')
		expect(stdout).toContain('Nothing was written.')
		expect(readFileSync(join(cwd, 'src/app.ts'), 'utf8')).toContain("z } from 'clibuilder'")
	})

	it('fails with unreadable-files and exit 1 for a file that exists but cannot be read, after writing the others', async () => {
		const cwd = project()
		writeFileSync(join(cwd, 'src/locked.ts'), 'export const a = 1\n')
		chmodSync(join(cwd, 'src/locked.ts'), 0)
		const { stdout, code } = await run(cwd, 'src')
		expect(code).toBe(1)
		expect(stdout).toContain('code: unreadable-files')
		expect(stdout).toContain('1 other file was changed.')
	})

	it('writes the diff to --diff-file and prints the findings on stdout', async () => {
		const cwd = project()
		const { stdout, stderr } = await run(cwd, 'src', '--dry-run', '--add-plugins', '--diff-file', 'out.diff')
		expect(stderr).toBe('')
		expect(stdout).toContain('scanned: 1')
		expect(stdout).toContain('git apply out.diff')
		expect(readFileSync(join(cwd, 'out.diff'), 'utf8').startsWith('--- a/src/app.ts\n+++ b/src/app.ts\n')).toBe(true)
		expect(readFileSync(join(cwd, 'src/app.ts'), 'utf8')).toContain("z } from 'clibuilder'")
	})

	it('needs --dry-run for --diff-file', async () => {
		const { stdout, code } = await run(project(), 'src', '--diff-file', 'out.diff')
		expect(code).toBe(2)
		expect(stdout).toContain('code: diff-file-needs-dry-run')
	})

	it('prints the diff on stdout and the report on stderr with --dry-run', async () => {
		const cwd = project()
		const { stdout, stderr } = await run(cwd, 'src', '--dry-run', '--add-plugins')
		expect(stdout.startsWith('--- a/src/app.ts\n+++ b/src/app.ts\n')).toBe(true)
		expect(stdout).toContain('+    "@clibuilder/plugins": "^0.2.0",')
		expect(stdout).not.toContain('scanned:')
		expect(stderr).toContain('1 file(s) scanned, 1 would change.')
		expect(readFileSync(join(cwd, 'src/app.ts'), 'utf8')).toContain("z } from 'clibuilder'")
	})

	it('says no file would change in dry-run, and still reports', async () => {
		const cwd = project()
		writeFileSync(join(cwd, 'src/app.ts'), 'export const a = 1\n')
		const { stdout, stderr } = await run(cwd, 'src', '--dry-run')
		expect(stdout).toBe('empty: 0 files would change\n')
		expect(stderr).toContain('1 file(s) scanned, 0 would change.')
	})

	it('reports a missing argument as a usage error on stdout, exit 2', async () => {
		const { stdout, stderr, code } = await run(project())
		expect(code).toBe(2)
		expect(stderr).toBe('')
		expect(stdout).toContain('code: missing-argument')
	})

	it('reports an unknown option as a usage error', async () => {
		const { stdout, code } = await run(project(), 'src', '--bogus')
		expect(code).toBe(2)
		expect(stdout).toContain('code: unknown-option')
	})

	it('has structured --help', async () => {
		const { stdout } = await run(project(), '--help')
		expect(stdout).toContain('name: clibuilder-codemod')
		expect(stdout).toContain('arguments[1]{name,required,type,array,description}:')
		expect(stdout).toMatch(/^ {2}dry-run,/m)
		expect(stdout).toContain('clibuilder-codemod --dry-run src')
	})

	it('prints the package version with --version', async () => {
		const { stdout } = await run(project(), '--version')
		const { version } = JSON.parse(readFileSync(join(import.meta.dirname, '../package.json'), 'utf8'))
		expect(stdout).toBe(`${version}\n`)
	})

	it('defaults to the process cwd and streams', () => {
		expect(() => codemodCli()).not.toThrow()
	})
})
