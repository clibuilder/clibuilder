import { Action } from './Action'
import { CommandBuilder } from './CommandBuilder'
import { HelpSectionBuilder } from './HelpSectionBuilder'

export class CliBuilder {
  version: string
  /**
   * The help template for the program
   */
  programHelpTemplate = `
<usage>
<description>
<arguments>
<commands>
<options>
<version>`
  /**
   * The help template for each command
   */
  commandHelpTemplate = `
<usage>
<description>
<arguments>
<commands>
<options>
<alias>
<noAction>`

  /**
   * Name of the cli application.
   * Derived from argv.
   */
  name: string
  /**
   * Location of the cli appliction.
   * Derived from argv.
   */
  location: string
  log = console.log
  error = console.error
  /**
   * The default action to use if there is no `.action()` for a command.
   * You can override this to support default custom logic.
   */
  defaultAction: Action<any, any>
  /**
   * Help section builder used to create help output.
   * You can drop in a replacement function of a particular section.
   * Remember they are used by both program and command help.
   * You should take that into consideration when you are overriding them.
   * Also, you should not use arrow function if you want to access the `builder` and `program` when building your help message.
   */
  helpSectionBuilder: HelpSectionBuilder
  public builder: CommandBuilder
  constructor() {
    this.builder = new CommandBuilder('', this, undefined)
    this.helpSectionBuilder = new HelpSectionBuilder(this.builder)
    this.builder
      .option('-h, --help', 'output usage information')
      .option('-v, --version', 'output the version number')
  }

  command(cmd: string = ''): CommandBuilder {
    if (cmd === '') {
      return this.builder.clear()
    }
    return this.builder.command(cmd)
  }

  start(argv) {
    const parts = argv[1].split('/')
    this.name = parts.pop()
    this.location = parts.join('/')

    const args = argv.slice(2)
    const command = this.builder.build(args)
    if (command) {
      command()
    }
    else {
      this.error(`\nUnknown command "${args}"\n`)
    }
  }
  /**
   * The default help action.
   * This action always bind to the CliBuilder itself,
   * so that it can access things like `this.version`
   */
  defaultHelpAction(args: any, options: any, builder: CommandBuilder, ui: UI) {
    if (options.version) {
      ui.log(this.version)
    }
    else if (options.help) {
      ui.log(builder.help())
    }
    else {
      ui.log(builder.help())
    }
  }
}

export interface UI {
  log(...args: string[]): void
  error(...args: string[]): void
}
