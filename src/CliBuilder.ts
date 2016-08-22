import { Action } from './Action'
import { CommandBuilder } from './CommandBuilder'
import { HelpSectionBuilder } from './HelpSectionBuilder'
import { Option } from './Option'

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
  private options: Option[] = []
  constructor() {
    // Add help to all commands by default
    this.option('-h, --help', 'output usage information')
    this.builder = new CommandBuilder('', this, undefined)
    this.helpSectionBuilder = new HelpSectionBuilder(this.builder)
    this.command().option('-v, --version', 'output the version number')
      .action<void, any>((args, options, builder, ui) => {
        if (options.version) {
          ui.log(this.version)
        }
        else if (options.help) {
          this.defaultHelpAction(args, options, builder, ui)
        }
        else {
          return this.defaultAction ? this.defaultAction(args, options, builder, ui) : false
        }
      })
  }

  /**
   * Add default option that will be added to the root and all commands.
   * This should be called before creating commands.
   */
  option(flags: string, description: string, valuesDescription?: { [name: string]: string }) {
    const option = new Option(flags, description, valuesDescription)
    this.options.push(option)
    return this
  }
  /**
   * Clears all default options, including the default help option
   * This should be called before creating commands.
   */
  clearOptions() {
    this.options = []
  }

  command(cmd: string = ''): CommandBuilder {
    const builder = cmd === '' ? this.builder.clear() : this.builder.command(cmd)

    for (const option of this.options) {
      builder.option(option.flags, option.description, option.valuesDescription)
    }
    return builder
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
   */
  defaultHelpAction(args: any, options: any, builder: CommandBuilder, ui: UI) {
    ui.log(builder.help())
  }
}

export interface UI {
  log(...args: string[]): void
  error(...args: string[]): void
}
