import { resolvePlugin } from './resolve_plugin.js'

it('falls back to the name as given when the plugin is not installed in cwd', () => {
	expect(resolvePlugin(process.cwd(), 'not-an-installed-plugin')).toBe('not-an-installed-plugin')
})

it('passes a file URL through unchanged', () => {
	const url = new URL('../../test-fixtures/plugins/registry-provider.js', import.meta.url).href
	expect(resolvePlugin(process.cwd(), url)).toBe(url)
})
