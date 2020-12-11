export namespace cli {
  export type Options = {
    /**
     * Name of the cli
     */
    name: string,
    version?: string,
    description?: string,
  }

  export type ConfigOptions = {
    name?: string,
    handler?: (params: {
      ui: unknown,
      filepath: string,
      config: unknown
    }) => unknown
  }

  export type UI = {
    displayLevel: DisplayLevel,
    info(...args: any[]): void,
    warn(...args: any[]): void,
    error(...args: any[]): void,
    debug(...args: any[]): void,
  }

  export type DisplayLevel = 'none' | 'info' | 'debug'

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
