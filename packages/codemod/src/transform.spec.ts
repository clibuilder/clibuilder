import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { transform } from './transform.js'

const fixtures = join(import.meta.dirname, '../fixtures')

function runFixture(name: string, options?: Parameters<typeof transform>[2]) {
	const file = join(fixtures, name, 'input.ts')
	const source = readFileSync(file, 'utf8')
	return { source, ...transform(source, file, options) }
}

function counts(findings: ReturnType<typeof transform>['findings']) {
	return {
		rewrite: findings.filter((f) => f.kind === 'rewrite').length,
		flag: findings.filter((f) => f.kind === 'flag').length,
		review: findings.filter((f) => f.kind === 'review').length
	}
}

describe('fixtures', () => {
	it.each([
		['cyber-mux', { rewrite: 8, flag: 7, review: 2 }],
		['repobuddy-buddy', { rewrite: 5, flag: 1, review: 1 }],
		['repobuddy-buddy-spec', { rewrite: 1, flag: 0, review: 0 }],
		['repobuddy-typescript', { rewrite: 4, flag: 0, review: 1 }],
		['zod-subset', { rewrite: 11, flag: 9, review: 0 }],
		['axi-imports', { rewrite: 2, flag: 4, review: 0 }],
		['plugins-keywords', { rewrite: 2, flag: 1, review: 1 }],
		['show-help', { rewrite: 0, flag: 2, review: 0 }]
	])('%s matches output.ts', async (name, expected) => {
		const result = runFixture(name)
		await expect(result.output).toMatchFileSnapshot(join(fixtures, name, 'output.ts'))
		expect(counts(result.findings)).toEqual(expected)
	})

	it.each([
		'cyber-mux',
		'repobuddy-buddy',
		'repobuddy-buddy-spec',
		'repobuddy-typescript',
		'zod-subset',
		'axi-imports',
		'plugins-keywords',
		'show-help'
	])('%s is unchanged by a second run', (name) => {
		const first = runFixture(name)
		expect(transform(first.output, 'input.ts').output).toBe(first.output)
	})
})

describe('zod', () => {
	const run = (body: string) => transform(`import { z } from 'clibuilder'\nexport const x = ${body}\n`, 'x.ts')

	it.each([
		['z.string()', 't.string()'],
		['z.number()', 't.number()'],
		['z.number().int()', 't.int()'],
		['z.number().min(1).max(9)', 't.number({ min: 1, max: 9 })'],
		['z.number().gte(1).lte(9)', 't.number({ min: 1, max: 9 })'],
		['z.number().int().nonnegative()', 't.int({ min: 0 })'],
		['z.string().regex(/a/)', 't.string({ pattern: /a/ })'],
		['z.boolean()', 't.boolean()'],
		['z.literal(true)', 't.literal(true)'],
		["z.enum(['a', 'b'])", "t.enum(['a', 'b'])"],
		["z.union([z.literal('a'), z.literal(`b`)])", "t.enum(['a', `b`])"],
		['z.array(z.string())', 't.array(t.string())'],
		['z.optional(z.string())', 't.string().optional()'],
		['z.string().optional()', 't.string().optional()'],
		['z.optional(z.array(z.string()))', 't.array(t.string()).optional()']
	])('rewrites %s to %s', (input, expected) => {
		const result = run(input)
		expect(result.output).toBe(`import { t } from 'clibuilder'\nexport const x = ${expected}\n`)
		expect(result.findings.every((f) => f.kind === 'rewrite')).toBe(true)
	})

	it.each([
		'z.string().email()',
		'z.string().url()',
		'z.string().min(1)',
		'z.array(z.string()).max(3)',
		'z.coerce.number()',
		'z.object({})',
		'z.string().transform((s) => s)',
		'z.string().refine((s) => s.length > 0)',
		'z.string().describe("x")',
		'z.number().min(1, "too small")',
		'z.string().regex(/a/, "no")',
		'z.string({ required_error: "x" })',
		'z.array(z.string().optional())',
		'z.array(z.array(z.string()))',
		'z.union([z.literal(1), z.literal(2)])',
		'z.union([])',
		'z.literal()',
		'z.array()',
		'z.optional()',
		'z.nativeEnum(E)',
		'z.string',
		'z.string().int()',
		'z.boolean().regex(/a/)',
		'z.number().optional(1)'
	])('flags %s and keeps it', (input) => {
		const result = run(input)
		expect(result.output).toContain(`export const x = ${input}\n`)
		expect(result.output).toMatch(/^\/\/ TODO\(clibuilder-12\): .*\nimport \{ z \} from 'clibuilder'/)
		expect(result.findings.filter((f) => f.rule === 'zod' && f.kind === 'flag')).toHaveLength(1)
	})

	it('flags a use of z as a value', () => {
		const result = run('{ z }')
		expect(result.findings.map((f) => f.message)).toContain(
			'`z` is removed from clibuilder 12. Replace this use with `t`.'
		)
	})

	it('keeps z next to t when some uses are flagged', () => {
		const result = run('[z.string(), z.string().email()]')
		expect(result.output).toContain("import { t, z } from 'clibuilder'")
		expect(result.output).toContain('[t.string(), z.string().email()]')
	})

	it('follows an aliased import and an existing t', () => {
		expect(transform("import { t, z as zod } from 'clibuilder'\nzod.string()\n", 'x.ts').output).toBe(
			"import { t } from 'clibuilder'\nt.string()\n"
		)
	})

	it('aliases t when the file already uses the name', () => {
		const result = transform("import { z } from 'clibuilder'\nconst t = 1\nz.string()\n", 'x.ts')
		expect(result.output).toBe("import { t as ct } from 'clibuilder'\nconst t = 1\nct.string()\n")
	})

	it('numbers t when t and ct are both taken', () => {
		const result = transform("import { z } from 'clibuilder'\nconst t = 1, ct = 2\nz.string()\n", 'x.ts')
		expect(result.output).toBe("import { t as t2 } from 'clibuilder'\nconst t = 1, ct = 2\nt2.string()\n")
	})

	it('removes an unused z import', () => {
		expect(transform("import { z } from 'clibuilder'\nexport {}\n", 'x.ts').output).toBe('export {}\n')
		expect(transform("import { cli, z } from 'clibuilder'\ncli\n", 'x.ts').output).toBe(
			"import { cli } from 'clibuilder'\ncli\n"
		)
	})

	it('leaves z from zod alone', () => {
		const source = "import { command } from 'clibuilder'\nimport { z } from 'zod'\nz.string().email()\n"
		expect(transform(source, 'x.ts').output).toBe(source)
	})

	it('ignores property names called z', () => {
		const source = "import { z } from 'clibuilder'\nconst o = { z: 1 }\no.z\ntype T = { z: number }\nz.string()\n"
		expect(transform(source, 'x.ts').output).toBe(
			"import { t } from 'clibuilder'\nconst o = { z: 1 }\no.z\ntype T = { z: number }\nt.string()\n"
		)
	})
})

describe('transform', () => {
	it('returns a file that does not import clibuilder unchanged', () => {
		const source = "// clibuilder\nimport { z } from 'zod'\nz.string()\n"
		expect(transform(source, 'x.ts')).toEqual({ output: source, findings: [], dependencies: [] })
		expect(transform('const a = 1\n', 'x.ts').findings).toEqual([])
	})

	it('parses JavaScript and JSX files', () => {
		expect(transform("import { z } from 'clibuilder'\nz.string()\n", 'x.mjs').output).toContain('t.string()')
		expect(transform("import { z } from 'clibuilder'\nconst a = <b />\nz.string()\n", 'x.jsx').output).toContain(
			't.string()'
		)
		expect(transform("import { z } from 'clibuilder'\nconst a = <b />\nz.string()\n", 'x.tsx').output).toContain(
			't.string()'
		)
	})

	it('adds one TODO line for repeated findings on a line', () => {
		const result = transform("import { z } from 'clibuilder'\nexport const a = [z.date(), z.date()]\n", 'x.ts')
		expect(result.output.match(/TODO/g)).toHaveLength(2)
	})
})

describe('plugins', () => {
	it('flags cli({ config }) by default and adds plugins() with addPlugins', () => {
		const flagged = runFixture('repobuddy-buddy')
		expect(flagged.findings.find((f) => f.rule === 'plugins')?.kind).toBe('flag')
		expect(flagged.dependencies).toEqual([])

		const added = runFixture('repobuddy-buddy', { addPlugins: true })
		expect(added.output).toContain("import { plugins } from '@clibuilder/plugins'")
		expect(added.output).toContain('}).use(config()).use(plugins())\n\t.command(testScripts)')
		expect(added.dependencies).toEqual(['@clibuilder/plugins'])
	})

	it('adds no plugins() to a cli that already uses @clibuilder/plugins, and loads its config before it', () => {
		const source =
			"import { cli } from 'clibuilder'\nimport { plugins } from '@clibuilder/plugins'\ncli({ name: 'a', config: true }).use(plugins())\n"
		expect(transform(source, 'x.ts', { addPlugins: true }).output).toBe(
			"import { cli } from 'clibuilder'\nimport { config } from 'clibuilder/config'\nimport { plugins } from '@clibuilder/plugins'\ncli({ name: 'a' }).use(config()).use(plugins())\n"
		)
	})

	it('moves shorthand keywords and aliases plugins when the name is taken', () => {
		const result = transform(
			"import { cli } from 'clibuilder'\nconst plugins = 1\nconst keywords = ['k']\ncli({ keywords, name: 'a' })\n",
			'x.ts'
		)
		expect(result.output).toContain("import { plugins as clibuilderPlugins } from '@clibuilder/plugins'")
		expect(result.output).toContain("cli({ name: 'a' }).use(clibuilderPlugins({ keywords }))")
	})

	it('moves keywords that is the only property', () => {
		const result = transform("import { cli } from 'clibuilder'\ncli({ keywords: ['k'] })\n", 'x.ts')
		expect(result.output).toContain("cli({ }).use(plugins({ keywords: ['k'] }))")
	})

	it('flags keywords it cannot move', () => {
		const result = transform("import { cli } from 'clibuilder'\ncli({ name: 'a', keywords() { return [] } })\n", 'x.ts')
		expect(result.findings.map((f) => f.kind)).toEqual(['flag'])
	})

	it('ignores a cli() without config or keywords, or with a non-literal argument', () => {
		const source = "import { cli } from 'clibuilder'\ncli({ name: 'a' })\ncli(options)\ncli()\n"
		expect(transform(source, 'x.ts').output).toBe(source)
	})
})

describe('axi imports', () => {
	it('moves a type-only import of value helpers', () => {
		expect(transform("import type { orEmpty } from '@clibuilder/axi'\n", 'x.ts').output).toBe(
			"import type { orEmpty } from 'clibuilder/axi'\n"
		)
	})

	it('flags a default or namespace import', () => {
		const result = transform("import * as axi from '@clibuilder/axi'\n", 'x.ts')
		expect(result.findings.map((f) => f.rule)).toEqual(['axi-import'])
		expect(result.output).toMatch(/^\/\/ TODO\(clibuilder-12\)/)
	})

	it('flags an export it does not know', () => {
		const result = transform("import { somethingNew } from '@clibuilder/axi'\n", 'x.ts')
		expect(result.findings[0]?.message).toContain('use the core feature that replaces it')
	})
})

describe('testing imports', () => {
	const run = (source: string) => transform(source, 'x.spec.ts')

	it('moves testCommand from clibuilder to clibuilder/testing', () => {
		const result = run("import { testCommand } from 'clibuilder'\n")
		expect(result.output).toBe("import { testCommand } from 'clibuilder/testing'\n")
		expect(result.findings.map((f) => [f.kind, f.rule, f.line])).toEqual([['rewrite', 'testing-import', 1]])
	})

	it('keeps the other names in the clibuilder import', () => {
		expect(run("import { command, testCommand as tc } from 'clibuilder'\n").output).toBe(
			"import { command } from 'clibuilder'\nimport { testCommand as tc } from 'clibuilder/testing'\n"
		)
	})

	it('joins an existing clibuilder/testing import', () => {
		expect(
			run("import { command, testCommand } from 'clibuilder'\nimport { mockPluginContext } from 'clibuilder/testing'\n")
				.output
		).toBe(
			"import { command } from 'clibuilder'\nimport { mockPluginContext, testCommand } from 'clibuilder/testing'\n"
		)
	})

	it('moves it from the same import the zod rule rewrites', () => {
		expect(run("import { testCommand, z } from 'clibuilder'\nexport const x = z.string()\n").output).toBe(
			"import { t } from 'clibuilder'\nimport { testCommand } from 'clibuilder/testing'\nexport const x = t.string()\n"
		)
	})

	it('leaves a testCommand that clibuilder/testing already provides', () => {
		const source = "import { testCommand } from 'clibuilder/testing'\n"
		expect(run(source)).toEqual({ output: source, findings: [], dependencies: [] })
	})

	it('flags testCommand read from a namespace import', () => {
		const result = run("import * as clibuilder from 'clibuilder'\nawait clibuilder.testCommand(cmd, 'cmd')\n")
		expect(result.findings.map((f) => [f.kind, f.rule, f.line])).toEqual([['flag', 'testing-import', 2]])
		expect(result.output).toContain('// TODO(clibuilder-12): `testCommand` is not exported from `clibuilder`')
	})
})

describe('printed returns', () => {
	it('lists returns in run() methods and run properties, but not in nested functions', () => {
		const result = transform(
			[
				"import { command } from 'clibuilder'",
				'command({ name: "a", run() { const f = function () { return 1 }; class C { m() { return 2 } }; return f() } })',
				'command({ name: "b", run: function () { return void 0 } })',
				'command({ name: "c", run: async () => await (value) })',
				'command({ name: "d", run: () => undefined })',
				'command({ name: "e", run: 1 })',
				'class K { run() { return 3 } }'
			].join('\n'),
			'x.ts'
		)
		expect(result.findings.map((f) => [f.line, f.message.slice(0, 20)])).toEqual([
			[2, '`return f()` in `run'],
			[4, '`return await (value']
		])
	})

	it('shortens a long returned expression', () => {
		const result = transform(
			`import { command } from 'clibuilder'\ncommand({ run() { return ${'a'.repeat(60)} } })\n`,
			'x.ts'
		)
		expect(result.findings[0]?.message).toContain('…')
	})
})

describe('format option', () => {
	it('flags only options of a command-like object', () => {
		const result = transform(
			"import { command } from 'clibuilder'\nconst a = { options: { format: {} } }\nconst b = { run() {}, options: { 'format': {} } }\n",
			'x.ts'
		)
		expect(result.findings.map((f) => [f.rule, f.line])).toEqual([['format-option', 3]])
	})
})

describe('config', () => {
	it('replaces config: true with .use(config()) from clibuilder/config', () => {
		const result = transform("import { cli } from 'clibuilder'\ncli({ name: 'a', config: true })\n", 'x.ts')
		expect(result.output).toContain("import { cli } from 'clibuilder'\nimport { config } from 'clibuilder/config'\n")
		expect(result.output).toContain("cli({ name: 'a' }).use(config())\n")
		expect(result.findings.filter((f) => f.rule === 'config').map((f) => f.kind)).toEqual(['rewrite'])
	})

	it("replaces config: 'name' with .use(config({ name }))", () => {
		const result = transform("import { cli } from 'clibuilder'\ncli({ config: 'other', name: 'a' })\n", 'x.ts')
		expect(result.output).toContain("cli({ name: 'a' }).use(config({ name: 'other' }))")
	})

	it('drops config: false', () => {
		const result = transform("import { cli } from 'clibuilder'\ncli({ name: 'a', config: false })\n", 'x.ts')
		expect(result.output).toBe("import { cli } from 'clibuilder'\ncli({ name: 'a' })\n")
	})

	it('flags a config it cannot read', () => {
		const result = transform("import { cli } from 'clibuilder'\ncli({ name: 'a', config: name })\n", 'x.ts')
		expect(result.findings.filter((f) => f.rule === 'config').map((f) => f.kind)).toEqual(['flag'])
		expect(result.output).toContain("cli({ name: 'a', config: name })")
		expect(result.output).not.toContain('import { config }')
	})

	it('aliases config when the file already binds the name', () => {
		const result = transform(
			"import { cli } from 'clibuilder'\nconst config = {}\ncli({ name: 'a', config: true })\n",
			'x.ts'
		)
		expect(result.output).toContain("import { config as clibuilderConfig } from 'clibuilder/config'")
		expect(result.output).toContain("cli({ name: 'a' }).use(clibuilderConfig())")
	})

	it('moves the config functions and types from clibuilder to clibuilder/config', () => {
		const result = transform(
			"import { cli, resolveConfig, type ConfigSource } from 'clibuilder'\nimport type { ConfigLoadResult } from 'clibuilder'\n",
			'x.ts'
		)
		expect(result.output).toBe(
			"import { cli } from 'clibuilder'\nimport { resolveConfig, type ConfigSource } from 'clibuilder/config'\nimport type { ConfigLoadResult } from 'clibuilder/config'\n"
		)
	})

	it('joins the config import it adds', () => {
		const result = transform(
			"import { cli, lookupConfig } from 'clibuilder'\ncli({ name: 'a', config: true })\n",
			'x.ts'
		)
		expect(result.output).toContain(
			"import { cli } from 'clibuilder'\nimport { config, lookupConfig } from 'clibuilder/config'\n"
		)
	})

	it('flags a config function used through a namespace import', () => {
		const result = transform("import * as c from 'clibuilder'\nc.resolveConfig()\n", 'x.ts')
		expect(result.findings.map((f) => [f.rule, f.kind])).toEqual([['config', 'flag']])
	})
})
