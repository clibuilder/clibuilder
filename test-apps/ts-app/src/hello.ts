import { command } from 'clibuilder'

export const hello = command({
	name: 'hello',
	description: 'hello world',
	async run() {
		this.ui.debug('hello')
	}
})
