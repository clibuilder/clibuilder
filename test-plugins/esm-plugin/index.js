export function activate(cli) {
  cli.addCommand({
    name: 'one',
    commands: [{
      name: 'echo',
      arguments: [{ name: 'arg1' }],
      run: function (args) {
        this.ui.info('echo')
        return args.arg1
      }
    }]
  })
}
