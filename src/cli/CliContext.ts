import { requiredDeep } from 'type-plus';
import { plainPresenterFactory } from '../presenter';
import { CliContext } from './interfaces';

export function buildContext<Context>(
  input: Context,
  overrideContext?: Partial<CliContext>
): CliContext & Context {
  return requiredDeep(
    { cwd: process.cwd(), presenterFactory: plainPresenterFactory },
    overrideContext,
    input as any) as any
}
