export function argsParser() {
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
