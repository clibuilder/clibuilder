import a from 'assertron';
import { CliContext, HelpPresenter, LogPresenter, plainPresenterFactory, PresenterOption, VersionPresenter } from '..';
import { buildContext } from './CliContext';

describe('buildContext()', () => {
  test('undefined context gets default context', () => {
    const context = buildContext(undefined)

    isDefaultContext(context)
  })

  test('empty object gets default context', () => {
    const context = buildContext({})

    isDefaultContext(context)
  })

  test('can override cwd', () => {
    const context = buildContext({ cwd: 'a' })

    a.satisfies(context, { cwd: 'a' })
  })

  test('can override part of presenterFactory', () => {
    const fn: (options: PresenterOption) => LogPresenter & HelpPresenter & VersionPresenter = (() => { return }) as any
    const context = buildContext({ presenterFactory: { createCliPresenter: fn } })

    a.satisfies(context, {
      presenterFactory: {
        createCliPresenter: (v: any) => v === fn,
        createCommandPresenter: (v: any) => v === plainPresenterFactory.createCommandPresenter
      }
    })
  })

  test('can include extra properties', () => {
    const context = buildContext({ a: 'a' })
    a.satisfies(context, {
      a: 'a',
      ...defaultContext
    })
  })
})

function isDefaultContext(context: CliContext) {
  expect(context).toEqual(defaultContext)
}

const defaultContext = {
  cwd: process.cwd(),
  presenterFactory: plainPresenterFactory
}
