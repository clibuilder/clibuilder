import { command } from 'clibuilder'

// getting The inferred type of ... cannot be named without a reference to zod
// in actual consuming package.
// but could not repro it here.
export const hello = command({
	name: 'hello',
	description: 'hello world',
	async run() {
		this.ui.debug('hello')
	}
})
