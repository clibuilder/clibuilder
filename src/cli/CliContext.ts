import { unpartialRecursively } from 'unpartial';
import { plainPresenterFactory } from '../presenter';
import { CliContext } from './interfaces';

export function buildContext<Context>(
  input: Context,
  overrideContext?: Partial<CliContext>
): CliContext & Context {
  return unpartialRecursively({ cwd: process.cwd(), presenterFactory: plainPresenterFactory }, overrideContext, input as any) as any
}
