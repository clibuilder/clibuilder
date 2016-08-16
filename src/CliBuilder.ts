import { CommandBuilder } from './CommandBuilder'

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
<alias>`

  name: string
  location: string
  log = console.log
  error = console.error
  private builder: CommandBuilder
  constructor() {
    this.builder = new CommandBuilder('', this, true)
    this.builder
      .option('-h, --help', 'output usage information')
      .option('-v, --version', 'output the version number')
      .action((args, options) => {
        if (options.version) {
          this.log(this.version)
        }
        else if (options.help) {
          this.log(this.builder.help())
        }
        else {
          this.log(this.builder.help())
        }
      })
  }

  command(cmd: string = '') {
    if (cmd === '') {
      return this.builder.clear()
    }
    return this.builder.command(cmd)
  }

  start(argv) {
    const parts = argv[1].split('/')
    this.name = parts.pop()
    this.location = parts.join('/')

    const command = this.builder.build(argv.slice(2))
    command()
  }
}
