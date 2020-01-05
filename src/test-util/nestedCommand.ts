import { CliCommand } from '../cli-command'
import { helloCommand } from './helloCommand'

export const nestedCommand: CliCommand = {
  name: 'nested',
  description: 'nested command',
  commands: [helloCommand]
}

export const nestedHelpMessage = `
Usage: cli nested <command>

  nested command

Commands:
  hello

nested <command> -h      Get help for <command>
`
