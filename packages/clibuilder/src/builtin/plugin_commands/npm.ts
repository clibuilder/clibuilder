// `find-installed-packages` and `search-packages` are the only npm-facing
// dependencies in the package, and they are needed by `plugins list` and
// `plugins search` alone. They are loaded lazily so their module init stays off
// the startup path of every CLI invocation (~16ms), and they are reached through
// each command's `context` so a test can substitute a fake.

export const findByKeywords: typeof import('find-installed-packages').findByKeywords = async (...args) =>
	(await import('find-installed-packages')).findByKeywords(...args)

// ignoring coverage. Reaching this shim means querying the npm registry for real,
// so every test substitutes `context.searchByKeywords` instead.
// istanbul ignore next
export const searchByKeywords: typeof import('search-packages').searchByKeywords = async (
	...args: any[]
): Promise<any> => (await import('search-packages')).searchByKeywords(...(args as [string[]]))
