export function activate(cli) {
	cli.addCommand({
		name: 'async',
		commands: [
			{
				name: 'echo',
				arguments: [{ name: 'arg1' }],
				// awaits real async work before producing output.
				// The process must still exit on its own once this settles.
				async run(args) {
					await new Promise((resolve) => setTimeout(resolve, 50))
					this.ui.info('echo', args.arg1)
					return args.arg1
				}
			}
		]
	})
}
