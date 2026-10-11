// A `cli()` that sets `keywords` uses plugins for certain; one that sets only `config` may not.
import { cli } from 'clibuilder'

export const withKeywords = cli({
	name: 'my-cli',
	version: '1.0.0',
	config: true,
	keywords: ['my-cli-plugin'],
}).default({
	run() {
		return this.keywords
	},
})
