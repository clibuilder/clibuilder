/**
 * The stdout and stderr driver: where every byte the cli writes goes through.
 *
 * It owns the two things that depend on the stream rather than on the message:
 * whether colour is allowed, and what happens when the reader goes away (EPIPE).
 */

import type { Streams } from '../core/ports.js'

/**
 * One stream as the cli writes to it.
 */
export type Sink = {
	write(text: string): void
	/**
	 * Whether text written here may carry colour.
	 */
	readonly colour: boolean
}

export type Sinks = { stdout: Sink; stderr: Sink }

type Env = Record<string, string | undefined>

type MaybeTTY = NodeJS.WritableStream & {
	isTTY?: boolean
	hasColors?(env?: Env): boolean
}

/**
 * Whether text written to `stream` may carry colour.
 *
 * A stream that is not a TTY is never coloured, whatever the environment says,
 * so piped or redirected output stays plain text.
 * On a TTY, `FORCE_COLOR` decides when it is set (`0` or `false` turns colour off),
 * then a non-empty `NO_COLOR` turns it off,
 * then the terminal's own `hasColors()` decides.
 * This is the order Node applies for its own colour detection.
 */
export function shouldColour(stream: NodeJS.WritableStream, env: Env = process.env) {
	const s = stream as MaybeTTY
	if (!s.isTTY) return false
	const force = env.FORCE_COLOR
	if (force !== undefined) return force !== '0' && force !== 'false'
	if (env.NO_COLOR) return false
	return typeof s.hasColors === 'function' ? s.hasColors(env) : true
}

export function createSinks(streams: Streams, env: Env = process.env): Sinks {
	if (streams.stdout === process.stdout) handleEpipe(process.stdout)
	return { stdout: createSink(streams.stdout, env), stderr: createSink(streams.stderr, env) }
}

function createSink(stream: NodeJS.WritableStream, env: Env): Sink {
	const colour = shouldColour(stream, env)
	return {
		colour,
		write(text) {
			if (closed.has(stream)) return
			stream.write(text)
		}
	}
}

const watched = new WeakSet<NodeJS.WritableStream>()
const closed = new WeakSet<NodeJS.WritableStream>()

/**
 * Ends output quietly when the reader of `stream` goes away, such as `cli | head -1`.
 *
 * On `EPIPE` the stream is marked closed, every later write to it is dropped,
 * and the exit code is set to 0: a reader that stopped early is not a failure.
 * Any other stream error is rethrown.
 *
 * Installed once per stream however many clis are built, and only on the
 * process's own stdout. A stream passed through `cli({ streams })` is the embedder's to handle.
 */
export function handleEpipe(stream: NodeJS.WritableStream) {
	if (watched.has(stream)) return
	watched.add(stream)
	stream.on('error', (err: NodeJS.ErrnoException) => {
		if (err?.code !== 'EPIPE') throw err
		closed.add(stream)
		process.exitCode = 0
	})
}
