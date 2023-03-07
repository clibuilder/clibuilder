export function activate(cli) {
	cli.addCommand({
		name: 'two',
		commands: [
			{
				name: 'echo',
				arguments: [{ name: 'arg1' }],
				run: function (args) {
					this.ui.info('echo')
					return args.arg1
				}
			}
		]
	})
}
