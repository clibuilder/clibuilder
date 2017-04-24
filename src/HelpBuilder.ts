import { CommandSpec } from './Command'

export class HelpBuilder {
  constructor(public command: CommandSpec) { }
  build() {
    const helpSections = [
      this.generateUsageSection(),
      this.generateCommandsSection(),
      this.generateArgumentSection(),
      this.generateOptionsSection(),
      this.generateAliasSection()
    ]
    return helpSections.filter(x => !!x).join('\n')
  }
  generateUsageSection() {
    return ''
  }
  generateCommandsSection() {
    return ''
  }
  generateArgumentSection() {
    return ''
  }
  generateOptionsSection() {
    return ''
  }
  generateAliasSection() {
    return ''
  }
}

//   getHelp() {
//     const names = getCommandAndAliasNames(this.commands)
//     return `<command>

// Commands:
//   ${names.join(', ')}

// ${this.name} <command> -h      Get help for <command>

// Options:
//   [-v|--version]          Print the CLI version
//   [-V|--verbose]          Turn on verbose logging
//   [--silent]              Turn off logging
// `
//   }
