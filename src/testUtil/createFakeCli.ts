import { Cli } from '../Cli'
import { InMemoryPresenter } from './InMemoryPresenter'
export function createFakeCli(...commandSpecs): Cli<any> {
  const presenterFactory = {
    createCliPresenter(options) { return new InMemoryPresenter(options) },
    createCommandPresenter(options) { return new InMemoryPresenter(options) }
  }
  return new Cli('cmd', '0.0.0', commandSpecs, { presenterFactory })
}
