export function createParser() {
	return {
		parse(argv: string[]) {
			return {
				_: argv
			}
		}
	}
}

export const parser = createParser()