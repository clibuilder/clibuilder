import { Cli } from '../Cli'
import { InMemoryPresenter } from './InMemoryDisplay'

export function createArgv(...args) {
  args.unshift('node', 'cli')
  return args
}

export function createFakeCli(...commandSpecs) {
  const presenterFactory = {
    createCliPresenter(options) { return new InMemoryPresenter(options) },
    createCommandPresenter(options) { return new InMemoryPresenter(options) }
  }
  return new Cli('cmd', '0.0.0', commandSpecs, { presenterFactory })
}
