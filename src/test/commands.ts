import { Command, createLogger, parseArgv, HelpBuilder } from '../index'

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
  log = createLogger('EchoCommand')
  process(args) {
    this.log.info.apply(this.log, args)
    return
  }
}

export const echoCommand: Command = new EchoCommand()
