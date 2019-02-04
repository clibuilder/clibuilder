import { RecursivePartial } from 'type-plus';
import { unpartialRecursively } from 'unpartial';
import { plainPresenterFactory } from '../presenter';
import { CliContext } from './interfaces';

export function buildContext<Context extends Record<string, any> = CliContext>(input: RecursivePartial<Context> | undefined): CliContext & Context {
  return unpartialRecursively({ cwd: process.cwd(), presenterFactory: plainPresenterFactory }, input) as any
}
