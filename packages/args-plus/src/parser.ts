export function createParser() {
	return {
		/**
		 * parse command line input: `process.argv.slice(2)`.
		 */
		parse(argv: string[]) {
			return {
				_: argv
			}
		}
	}
}

export const parser = createParser()
