import { Cli, Command, CommandSpec, createLogger, parseArgv, HelpBuilder } from '../index'

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


export function createNoCommandCli(): any {
  return createCliWithCommands()
}

export function createNoOpCli(): any {
  return createCliWithCommands(noopCommand)
}

export function createCliWithCommands(...commands: Array<CommandSpec & { process: any }>) {
  return new Cli('cli', '0.2.1', commands.map(c => createCommand(c)))
}
