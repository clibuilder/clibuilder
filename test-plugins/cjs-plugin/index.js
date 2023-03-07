module.exports = {
	activate: function activate(cli) {
		cli.addCommand({
			name: 'one',
			commands: [
				{
					name: 'echo',
					arguments: [{ name: 'arg1' }],
					run: function (args) {
						this.ui.info('echo', args.arg1)
						return args.arg1
					}
				}
			]
		})
	}
}
