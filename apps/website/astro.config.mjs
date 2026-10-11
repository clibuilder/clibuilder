// @ts-check
import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

export default defineConfig({
	site: 'https://clibuilder.github.io',
	base: '/clibuilder/',
	redirects: {
		'/api/zod': '/clibuilder/api/t/'
	},
	vite: {
		plugins: [tailwindcss()]
	},
	integrations: [
		starlight({
			title: 'clibuilder',
			description: 'A highly customizable command line application builder for Node.js.',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/clibuilder/clibuilder'
				},
				{
					icon: 'npm',
					label: 'npm',
					href: 'https://npmjs.org/package/clibuilder'
				}
			],
			customCss: ['./src/styles/global.css'],
			editLink: {
				baseUrl: 'https://github.com/clibuilder/clibuilder/edit/main/apps/website/'
			},
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'getting-started/introduction' },
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Your First CLI', slug: 'getting-started/first-cli' }
					]
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Commands', slug: 'guides/commands' },
						{ label: 'Arguments & Options', slug: 'guides/arguments-and-options' },
						{ label: 'Configuration', slug: 'guides/configuration' },
						{ label: 'Plugins', slug: 'guides/plugins' },
						{ label: 'Failing', slug: 'guides/failing' },
						{ label: 'Testing', slug: 'guides/testing' },
						{ label: 'Publishing', slug: 'guides/publishing' },
						{
							label: 'Upgrading to 12',
							slug: 'guides/upgrade-to-12',
							badge: { text: 'unreleased', variant: 'caution' }
						}
					]
				},
				{
					label: 'API Reference',
					items: [
						{ label: 'Overview', slug: 'api' },
						{ label: 'cli()', slug: 'api/cli' },
						{ label: 'command()', slug: 'api/command' },
						{ label: 'UI', slug: 'api/ui' },
						{ label: 'testCommand()', slug: 'api/test-command' },
						{ label: 'parseArgv()', slug: 'api/parse-argv' },
						{ label: 'enableCompileCache()', slug: 'api/compile-cache' },
						{ label: 'clibuilder/axi', slug: 'api/axi' },
						{ label: 't', slug: 'api/t' }
					]
				},
				{
					label: 'Packages',
					items: [
						{ label: '@clibuilder/axi', slug: 'packages/axi' },
						{
							label: '@clibuilder/plugins',
							slug: 'packages/plugins',
							badge: { text: 'unreleased', variant: 'caution' }
						},
						{ label: 'args-minus', slug: 'packages/args-minus', badge: { text: 'unreleased', variant: 'caution' } }
					]
				},
				{
					label: 'Roadmap',
					items: [{ label: 'Roadmap to v12', slug: 'roadmap/v12' }]
				},
				{
					label: 'Showcase',
					slug: 'showcase'
				}
			]
		})
	]
})
