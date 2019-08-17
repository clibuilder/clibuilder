import { Cli } from '../cli';
import { getCliCommand } from '../cli-command';
import { InMemoryPresenter } from './InMemoryPresenter';
import { createCliArgv } from './createCliArgv';

export function setupCliTest(cli: Cli<any, any>, argv: string[]) {
  const cmd = getCliCommand([...argv], cli.commands)
  const subject = cmd || cli
  const ui = (subject as any).ui = new InMemoryPresenter({ name: subject.name })
  return {
    argv: createCliArgv(cli.name, ...argv),
    ui,
  }
}
