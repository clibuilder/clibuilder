export type Task = {
	id: number
	title: string
	state: 'open' | 'closed'
	assignee: string
	createdAt: string
	updatedAt: string
	labels: string[]
	body: string
}

const tasks: Task[] = []

export function loadTasks(): Task[] {
	return tasks
}

export function findTask(id: number): Task | undefined {
	return tasks.find((t) => t.id === id)
}
