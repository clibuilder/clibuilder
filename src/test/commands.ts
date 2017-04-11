import { Command, createLogger } from '../index'

class EchoCommand implements Command {
  name = 'echo'
  log = createLogger('EchoCommand')
  run(argv: string[]) {
    this.log.info.apply(this.log, argv)
    return
  }
}

export const echo2Command: Command = new EchoCommand()

export const echoCommand = {
  name: 'echo',
  log: createLogger('EchoCommand'),
  run(argv: string[]) {
    this.log.info(...argv)
    return
  }
} as Command

export const noopCommand = {
  name: 'noop',
  run() { return }
} as Command
