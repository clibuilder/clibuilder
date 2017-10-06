import { Cli } from '../Cli'
import { InMemoryPresenter } from './InMemoryPresenter'


export function createCli(cwd: string, ...commands) {
  return new Cli('fakeCli', '0.0.0', commands, {
    cwd, presenterFactory: {
      createCliPresenter(opt) { return new InMemoryPresenter(opt) },
      createCommandPresenter(opt) { return new InMemoryPresenter(opt) }
    }
  })
}
