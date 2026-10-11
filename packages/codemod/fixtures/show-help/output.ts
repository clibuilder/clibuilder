// `ui.showHelp()` and `ui.showVersion()` leave `ui`; `run()` returns `result()`, `document()` and `empty()` already.
import { command, document, empty, result } from 'clibuilder'

export const group = command({
	name: 'group',
	run() {
		// TODO(clibuilder-12): `ui.showHelp()` is removed from `ui` in clibuilder 12; core answers `--help` on stdout. To answer from `run()`, return the content with `document(text)` or `result(value)`.
		this.ui.showHelp()
	},
})

export const version = command({
	name: 'version-info',
	run() {
		const { ui } = this
		// TODO(clibuilder-12): `ui.showVersion()` is removed from `ui` in clibuilder 12; core answers `--version` on stdout. To answer from `run()`, return the content with `document(text)` or `result(value)`.
		ui.showVersion()
	},
})

export const answers = command({
	name: 'answers',
	async run() {
		if (Math.random() > 0.5) return result({ a: 1 }, { help: ['run `cli answers` again'] })
		if (Math.random() > 0.5) return document('# hello')
		if (Math.random() > 0.5) return undefined
		return empty('no answers')
	},
})
