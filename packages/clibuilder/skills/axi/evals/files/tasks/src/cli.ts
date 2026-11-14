#!/usr/bin/env node
import { cli, command, t } from 'clibuilder'
import { findTask, loadTasks } from './store.js'

const list = command({
	name: 'list',
	description: 'list tasks',
	run() {
		return loadTasks()
	}
})

const get = command({
	name: 'get',
	description: 'show one task',
	options: { id: { description: 'task id', type: t.int() } },
	run(args) {
		const task = findTask(args.id)
		if (!task) {
			// biome-ignore lint/suspicious/noConsole: writes to the terminal
			console.log(`Task ${args.id} does not exist`)
			process.exit(1)
		}
		return { ...task, next: 'Run `tasks task close --id N` to close it, or `tasks task reopen --id N`' }
	}
})

cli({ name: 'tasks', version: '0.1.0' })
	.command({ name: 'task', description: 'manage tasks', commands: [list, get] })
	.parse(process.argv)
