import { CliCommand } from '../cli-command'

export const helloCommand: CliCommand = {
  name: 'hello',
  async run() {

    return 'hello'
  },
}

export const helloHelpMessage = `
Usage: cli <command>

Commands:
  hello

cli <command> -h         Get help for <command>

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`
