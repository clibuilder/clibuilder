import * as z from 'zod'
import type { cli } from './cli.js'

export function command<
  Context extends Record<string, any>,
  ConfigType extends z.ZodTypeAny = z.ZodTypeAny,
  AName extends string = string,
  A extends cli.Command.Argument<AName>[] = cli.Command.Argument<AName>[],
  O extends cli.Command.Options = cli.Command.Options
>(cmd: cli.Command<Context, ConfigType, A, O>) {
  return cmd
}
