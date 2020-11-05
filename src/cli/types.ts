export namespace cli {
  export type Config = {
    name?: string
  }
  export type Builder = {
    loadConfig(typeDef: any): Omit<Builder, 'loadConfig'>,
    loadPlugins(): Omit<Builder, 'loadPlugin'>,
    default(command: any): cli.Executable,
    addCommand(command: any): cli.Executable
  }
  export type Executable = {
    parse<Result extends any>(argv?: string[]): Promise<Result>
  }
}
