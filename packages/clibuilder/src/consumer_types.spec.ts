import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('type-checks the public stream types without @types/node', () => {
	const ports = fileURLToPath(new URL('./core/ports.ts', import.meta.url))
	const consumer = fileURLToPath(new URL('./consumer.fixture.ts', import.meta.url))
	const source = [
		`import type { Streams } from ${JSON.stringify(ports.replace(/\.ts$/, '.js'))}`,
		'export const streams: Streams = {',
		'	stdout: { write: (chunk: string) => chunk.length, isTTY: true },',
		'	stderr: { write: () => undefined }',
		'}'
	].join('\n')
	const options: ts.CompilerOptions = {
		module: ts.ModuleKind.NodeNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		strict: true,
		noEmit: true,
		skipLibCheck: false,
		types: []
	}
	const host = ts.createCompilerHost(options)
	const readFile = host.readFile.bind(host)
	const fileExists = host.fileExists.bind(host)
	host.fileExists = (name) => name === consumer || fileExists(name)
	host.readFile = (name) => (name === consumer ? source : readFile(name))
	host.getSourceFile = (
		(getSourceFile) =>
		(name, ...rest) =>
			name === consumer ? ts.createSourceFile(name, source, ts.ScriptTarget.ES2020) : getSourceFile(name, ...rest)
	)(host.getSourceFile.bind(host))
	const program = ts.createProgram([consumer], options, host)
	const messages = ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
	expect(messages).toEqual([])
})
