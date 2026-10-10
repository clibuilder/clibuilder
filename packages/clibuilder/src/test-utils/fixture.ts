import path from 'node:path'

export function getFixturePath(target: string) {
	return path.resolve(process.cwd(), 'fixtures', target)
}
