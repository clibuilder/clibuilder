// Mirrors repobuddy/buddy's specs: `testCommand` imported from the root entry, which clibuilder 12
// no longer exports it from.
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from '@jest/globals'
import { testCommand } from 'clibuilder/testing'
import { checkDependenciesCommand } from './check_dependencies_command.js'

const created: string[] = []

async function project(files: Record<string, unknown>) {
	const dir = await mkdtemp(join(process.cwd(), 'node_modules', '.repobuddy-check-deps-cmd-'))
	created.push(dir)
	for (const [name, content] of Object.entries(files)) {
		await writeFile(join(dir, name), JSON.stringify(content), 'utf-8')
	}
	return dir
}

afterAll(() => Promise.all(created.map((dir) => rm(dir, { recursive: true, force: true }))))

describe('check-deps', () => {
	it('succeeds and says so when every used package is declared', async () => {
		const dir = await project({
			'package.json': { name: 'consumer', devDependencies: { 'ts-jest': '^29' } },
			'jest.config.json': { transform: { '^.+\\.ts$': 'ts-jest' } },
		})

		const { messages, exitCode } = await testCommand(checkDependenciesCommand, `check-deps --cwd=${dir}`)

		expect(exitCode).toBeUndefined()
		expect(messages).toContain('all declared in package.json')
	})

	it('accepts the check-dependencies alias', async () => {
		const dir = await project({ 'package.json': { name: 'consumer' } })

		const { exitCode } = await testCommand(checkDependenciesCommand, `check-dependencies --cwd=${dir}`)

		expect(exitCode).toBeUndefined()
	})
})
