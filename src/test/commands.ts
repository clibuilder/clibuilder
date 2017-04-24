import { Command, CommandSpec, createLogger, parseArgv, HelpBuilder } from '../index'

export function createCommand(config?: CommandSpec): Command {
  return {
    ...noopCommand,
    ...config
  }
}

class EchoCommand extends Command {
  name = 'echo'
  log = createLogger('EchoCommand')
  process(args) {
    this.log.info.apply(this.log, args)
    return
  }
}

export const echoCommand: Command = new EchoCommand()

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
