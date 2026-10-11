// A `cli()` that sets `keywords` uses plugins for certain; one that sets only `config` may not.
import { cli } from 'clibuilder'
import { plugins } from '@clibuilder/plugins'

export const withKeywords = cli({
	name: 'my-cli',
	version: '1.0.0',
	config: true,
}).use(plugins({ keywords: ['my-cli-plugin'] })).default({
	run() {
		// TODO(clibuilder-12): `this.keywords` is removed in clibuilder 12. Pass the keywords to `plugins({ keywords })` and read them from there.
		return this.keywords
	},
})
