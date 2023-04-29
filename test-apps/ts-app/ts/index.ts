import { cli } from 'clibuilder'
import { hello } from './hello'

export const app = cli({
	name: 'ts-app',
	version: '0.0.0'
}).default({
	commands: [hello]
})
