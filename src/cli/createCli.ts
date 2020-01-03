import { KeyofOptional, requiredDeep } from 'type-plus'
import { parseArgv } from '../argv-parser'

export type Cli2 = {
  name: string,
  version: string,
  /**
   * parse process.argv
   */
  parse(argv: string[]): Promise<any> | void,
}

export namespace Cli2 {
  export type ConstructOptions<
    Name extends string = string,
    Name1 extends string = string,
    Name2 extends string = string,
    Name3 extends string = string,
    O extends Options<Name1, Name2, Name3> = Options<Name1, Name2, Name3>
    > = {
      name: string,
      version: string,
      arguments?: Argument<Name>[],
      options?: O,
      run(args: RunArgs<Name, Name1, Name2, Name3, O>, argv: string[]): Promise<any> | any,
    }
  export type RunArgs<
    Name extends string = string,
    Name1 extends string = string,
    Name2 extends string = string,
    Name3 extends string = string,
    O extends Options<Name1, Name2, Name3> = Options<Name1, Name2, Name3>
    > = DefaultArgs & ArgsForArguments<Argument<Name>> & Record<KeyofOptional<O['boolean']>, boolean> & Record<KeyofOptional<O['string']>, string> & Record<KeyofOptional<O['number']>, number>

  export type DefaultArgs = {
    help: boolean,
    version: boolean,
    verbose: boolean,
    silent: boolean
  }

  export type Argument<Name extends string = string> = {
    name: Name,
    description?: string,
    required?: boolean,
    multiple?: boolean,
  }

  export type ArgsForArguments<A extends Argument> = { [K in A['name']]: string }

  export type Options<Name extends string = string, Name2 extends string = string, Name3 extends string = string,> = {
    boolean?: BooleanOptions<Name>,
    string?: StringOptions<Name2>,
    number?: NumberOptions<Name3>,
  }

  export type TypedOptions<T> = {
    description: string,
    alias?: string[],
    default?: T,
    /**
     * An option group this option belongs to.
     * If the option belongs to a group and one of the options has be set,
     * the other options will not have their default value.
     */
    group?: string,
  }

  export type BooleanOptions<Name extends string> = Record<Name, TypedOptions<boolean>>

  export type StringOptions<Name extends string> = Record<Name, TypedOptions<string>>

  export type NumberOptions<Name extends string> = Record<Name, TypedOptions<number>>

  export type ArgsForOptions<O extends Record<string, any> | undefined> = O extends Record<string, any> ? Record<keyof O, boolean> : never
}

export function createCli<
  Name extends string = string,
  Name1 extends string = string,
  Name2 extends string = string,
  Name3 extends string = string,
  >(options: Cli2.ConstructOptions<Name, Name1, Name2, Name3>): Cli2 {
  return {
    name: options.name,
    version: options.version,
    parse(argv: string[]) {
      argv = argv.slice(1)
      options.run(parseArgv(requiredDeep(defaultOptions, options), argv) as any, argv)
    }
  }
}

const defaultOptions = {
  boolean: {
    'help': {
      description: 'Print help message',
      alias: ['h'],
    },
    'version': {
      description: 'Print the CLI version',
      alias: ['v'],
    },
    'verbose': {
      description: 'Turn on verbose logging',
      alias: ['V'],
    },
    'silent': {
      description: 'Turn off logging',
    },
    'debug-cli': {
      description: 'Display clibuilder debug messages',
    },
  },
}
