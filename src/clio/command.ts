import { UnionOfValues } from 'type-plus'
import z from 'zod'
import { UI } from './types'

export function command<
  Config extends Record<string, any> = Record<string, any>,
  AName extends string = string,
  A extends command.Argument<AName>[] = command.Argument<AName>[],
  O extends command.Options = command.Options
>(options?: command.Command<Config, A, O>) {
  return options
}

export namespace command {
  export type Command<
    Config extends Record<string, any> = Record<string, any>,
    A extends command.Argument[] = command.Argument[],
    O extends command.Options = command.Options
    > = {
      name: string
    } & DefaultCommand<Config, A, O>

  export type Argument<
    Name extends string = string,
    Type extends z.ZodType<any> = z.ZodType<any>,
    > = { name: Name, description: string, type?: Type }

  export type Options<
    Name extends string = string,
    Type extends z.ZodType<any> = z.ZodType<any>,
    > = Record<Name, OptionEntry<Type>>

  export type OptionEntry<
    Type extends z.ZodType<any> = z.ZodType<any>
    > = {
      description: string,
      type?: Type,
      default?: z.infer<Type>,
      alias?: string[]
    }
  export type DefaultCommand<
    Config extends Record<string, any> = Record<string, any>,
    A extends command.Argument[] = command.Argument[],
    O extends command.Options = command.Options,
    > = {
      description?: string,
      arguments?: A,
      options?: O,
      run(this: {
        ui: UI,
        config: Config
      }, args: RunArgs<A, O>): Promise<any> | any
    }

  export type RunArgs<A extends Argument[], O extends Options> =
    A extends Argument<infer AName>[] ? O extends Options<infer OName>
    ? (
      { [k in AName]: Extract<UnionOfValues<A>, { name: k }>['type'] extends infer AT
        ? (undefined extends AT
          ? string
          : AT extends z.ZodType<any> ? z.infer<AT> : never)
        : never
      } & { [k in OName]: O[k]['type'] extends infer OT
        ? (undefined extends OT
          ? boolean
          : OT extends z.ZodType<any> ? z.infer<OT> : never)
        : never } extends infer R
      ? (OName extends 'help' ? R : R & { help: boolean })
      : never)
    : never : never
}
