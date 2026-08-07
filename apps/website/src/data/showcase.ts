/**
 * Curated list of CLIs built with `clibuilder`.
 *
 * This is static, hand-maintained data — there is no submission form and no registry sync.
 * To add an entry, open a pull request against this file.
 *
 * Two rules keep the list useful:
 *
 * 1. The project must actually depend on `clibuilder` — a reviewer should be able to open the
 *    linked repository and find it in a `package.json`.
 * 2. `repo` must resolve. `npm` is optional; omit it for projects that are not published.
 */
export type ShowcaseEntry = {
	/** Display name — the npm package name where there is one, otherwise the project name. */
	name: string
	/** One line on what the CLI does. No marketing copy. */
	description: string
	/** Source repository. Required. */
	repo: string
	/** npm package page, for published CLIs. */
	npm?: string
}

export const showcase: ShowcaseEntry[] = [
	{
		name: 'repobuddy',
		description:
			'Manages repository configuration — GitHub setup, dependency update PRs — and installs agent skills for AI coding assistants.',
		repo: 'https://github.com/repobuddy/repobuddy',
		npm: 'https://www.npmjs.com/package/repobuddy'
	},
	{
		name: '@mocktomata/cli',
		description: 'Command line interface for mocktomata, a behavior simulator for tests.',
		repo: 'https://github.com/mocktomata/mocktomata',
		npm: 'https://www.npmjs.com/package/@mocktomata/cli'
	},
	{
		name: '@unional/uni-cli',
		description: 'Development CLI tool for day-to-day repository chores.',
		repo: 'https://github.com/unional/uni-cli',
		npm: 'https://www.npmjs.com/package/@unional/uni-cli'
	},
	{
		name: 'eslintest',
		description: 'Test runner for eslint configs, rules, and plugins.',
		repo: 'https://github.com/unional/eslintest'
	},
	{
		name: 'upstream-monitor',
		description: 'Watches upstream dependencies of a project and reports what has moved.',
		repo: 'https://github.com/jplomas/upstream-monitor'
	}
]
