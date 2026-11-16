import { command, empty, result } from 'clibuilder'

export const tasks = [
	{ id: 1, title: 'write the docs' },
	{ id: 2, title: 'fix the build' }
]

export const list = command({
	name: 'list',
	description: 'list the open tasks',
	run() {
		if (tasks.length === 0) return empty('0 open tasks found', { help: 'Run `tasks add` to add one' })
		return result({ items: tasks })
	}
})
