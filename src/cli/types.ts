import { T } from 'type-plus'
import { CommandModel } from '../presenter'

export namespace cli {
  export type Options = {
    /**
     * Name of the cli
     */
    name: string,
    version?: string,
    description?: string,
  }

  export type ConfigOptions<T extends T.AllType> = {
    /**
     * Name of the config file to load.
     * Defaults to the name of the cli package (not the bin).
     * You can specify the exact file name,
     * or it will automatically look for the following:
     *
     * `{name}.json`
     * `.{name}rc`
     * `.{name}rc.json
     */
    name?: string,
    /**
     * Describe the shape of the config,
     * using `T` from `type-plus`.
     */
    type: T
  }

  export type UI = {
    displayLevel: DisplayLevel,
    info(...args: any[]): void,
    warn(...args: any[]): void,
    error(...args: any[]): void,
    debug(...args: any[]): void,
    showHelp(command: CommandModel): void,
    showVersion(version?: string): void,
  }

  export type DisplayLevel = 'none' | 'info' | 'debug'

  export type Builder<Config> = {
    readonly name: string,
    readonly version?: string,
    readonly description?: string,
    readonly config: Config,
    loadConfig<
      ConfigType extends T.AllType,
      This extends Partial<Builder<any>>
    >(
      this: This,
      options: cli.ConfigOptions<ConfigType>
    ): Omit<typeof this, 'loadConfig' | 'config'> & { config: T.Generate<ConfigType> },
    loadPlugins<
      This extends Partial<Builder<any>>
    >(this: This): Omit<typeof this, 'loadPlugin'>,
    /**
     * Default command when no sub-command matches.
     */
    default<
      This extends Partial<Builder<any>>
    >(this: This, command: Omit<Command<This['config']>, 'name'>): Omit<typeof this, 'default'>,
    addCommands<
      This extends Partial<Builder<any>>
    >(this: This, commands: Command<This['config']>[]): typeof this,
    parse<
      This extends Partial<Builder<any>>
    >(this: This, argv: string[]): Promise<void>
  }

  export type Command<Config = any> = {
    name: string,
    description?: string,
    options?: any,
    run(this: {
      ui: cli.UI,
      config: Config
    }, args: any): any
  }

  export type Executable = {
    parse<Result extends any>(argv?: string[]): Promise<Result>
  }
}
