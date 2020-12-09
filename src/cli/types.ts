export namespace cli {
  export type Options = {
    /**
     * Name of the cli
     */
    name: string,
    version?: string
  }
  export type Builder = {
    loadConfig(typeDef: any): Omit<Builder, 'loadConfig'>,
    loadPlugins(): Omit<Builder, 'loadPlugin'>,
    /**
     * Default command when no sub-command matches.
     */
    default(command: any): cli.Executable,
    addCommand(command: any): cli.Executable
  }

  export type Executable = {
    parse<Result extends any>(argv?: string[]): Promise<Result>
  }
}
