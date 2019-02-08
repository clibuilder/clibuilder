import { Cli } from '../cli';
import { CliCommandInstance } from '../cli-command';

export function findCliCommand(cli: Cli, commandName: string, ...nestedCommandNames: string[]) {
  return findCmd(cli, commandName, nestedCommandNames)
}

function findCmd(
  subject: { commands?: CliCommandInstance<any, any>[] },
  commandName: string,
  nestedCommandNames: string[]): CliCommandInstance<any, any> | undefined {
  if (!subject.commands) return undefined

  const command = subject.commands.find(c => c.name === commandName)
  if (!command || nestedCommandNames.length === 0) return command
  const [next, ...rest] = nestedCommandNames
  return findCmd(command, next, rest)
}
