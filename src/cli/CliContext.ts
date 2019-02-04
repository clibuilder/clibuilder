import { RecursivePartial } from 'type-plus';
import { unpartialRecursively } from 'unpartial';
import { plainPresenterFactory } from '../presenter';
import { CliContext } from './interfaces';

export function buildContext<
  Context extends Record<string, any> = CliContext
>(
  input: RecursivePartial<Context> | undefined,
  overrideContext?: Partial<CliContext>
): CliContext & Context {
  return unpartialRecursively({ cwd: process.cwd(), presenterFactory: plainPresenterFactory }, overrideContext, input) as any
}
