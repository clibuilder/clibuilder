/**
 * The stdout and stderr driver: where every byte the cli writes goes through.
 *
 * It owns the two things that depend on the stream rather than on the message:
 * whether colour is allowed, and what happens when the reader goes away (EPIPE).
 */

import type { Streams, WritableStream } from '../core/ports.js'

export type Sink = {
	write(text: string): void
	/** Whether text written here may carry colour. */
	readonly colour: boolean
}

export type Sinks = { stdout: Sink; stderr: Sink }

type Env = Record<string, string | undefined>

/**
 * Whether text written to `stream` may carry colour.
 * A non-TTY is never coloured, so piped output stays plain. On a TTY: `FORCE_COLOR` (`0`/`false` is off),
 * then a non-empty `NO_COLOR`, then `hasColors()`, the order Node applies.
 */
export function shouldColour(stream: WritableStream, env: Env = process.env) {
	if (!stream.isTTY) return false
	const force = env.FORCE_COLOR
	if (force !== undefined) return force !== '0' && force !== 'false'
	if (env.NO_COLOR) return false
	return typeof stream.hasColors === 'function' ? stream.hasColors(env) : true
}

export function createSinks(streams: Streams, env: Env = process.env): Sinks {
	if (streams.stdout === process.stdout) handleEpipe(process.stdout)
	return { stdout: createSink(streams.stdout, env), stderr: createSink(streams.stderr, env) }
}

function createSink(stream: WritableStream, env: Env): Sink {
	const colour = shouldColour(stream, env)
	return {
		colour,
		write(text) {
			if (closed.has(stream)) return
			stream.write(text)
		}
	}
}

const watched = new WeakSet<object>()
const closed = new WeakSet<object>()

/**
 * Ends output quietly when the reader of `stream` goes away, such as `cli | head -1`:
 * on `EPIPE` later writes are dropped and the exit code is 0. Any other stream error is rethrown.
 *
 * Installed once per stream, and only on the process's own stdout.
 * A stream passed through `cli({ streams })` is the embedder's to handle.
 */
export function handleEpipe(stream: { on(event: 'error', listener: (err: { code?: string }) => void): unknown }) {
	if (watched.has(stream)) return
	watched.add(stream)
	stream.on('error', (err) => {
		if (err?.code !== 'EPIPE') throw err
		closed.add(stream)
		process.exitCode = 0
	})
}
