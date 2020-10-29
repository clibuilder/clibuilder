import { createCommand } from '../create-cli'
import { helloCommand } from './helloCommand'

export const nestedCommand = createCommand({
  name: 'nested',
  description: 'nested command',
  config: { a: 'a' },
  commands: [helloCommand]
})

export const nestedHelpMessage = `
Usage: cli nested <command>

  nested command

Commands:
  hello

nested <command> -h      Get help for <command>
`
