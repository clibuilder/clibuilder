import { Command, parseArgv, HelpBuilder } from '../index'

export const noopCommand = (() => {
  return {
    name: 'noop',
    helpBuilder: new HelpBuilder(noopCommand),
    run(argv) {
      this.process(parseArgv(this, argv))
    },
    process() { return }
  }
})()

class EchoCommand extends Command {
  name = 'echo'
  process(args) {
    this.ui.info(...args)
  }
}

export const echoCommand: Command = new EchoCommand()
