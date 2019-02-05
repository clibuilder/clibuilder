// import t from 'assert'

import t from 'assert';
import a from 'assertron';
import { CliCommand, createCliCommand, MultipleArgumentNotLastEntry, OptionNameNotUnique } from '.';
import { plainPresenterFactory } from '../presenter';
import { setupCliCommandTest } from '../test-util';

test('definding cmd must to specify name and run can be () => void', () => {
  isCliCommand({
    name: 'cmd',
    run() { return }
  })
})

test(`run() can return a Promise<any>`, () => {
  isCliCommand({
    name: 'cmd',
    run(args) { return Promise.resolve() }
  })

  isCliCommand({
    name: 'cmd',
    run(args, argv) { return Promise.resolve(true) }
  })
})

test('this in run can access config', async () => {
  const { cmd, args, argv } = setupCliCommandTest({
    name: 'cmd',
    run() {
      return Promise.resolve(this.config!.a + this.context.b)
    }
  }, [], { a: 'a' }, { b: 'b' })

  t.strictEqual(await cmd.run(args, argv), 'ab')
})

test('can define arguments', () => {
  isCliCommand({
    name: 'cmd',
    arguments: [
      { name: 'arg' }
    ],
    run() { return }
  })
  isCliCommand({
    name: 'cmd',
    arguments: [
      { name: 'arg2', description: 'desc' }
    ],
    run() { return }
  })
  isCliCommand({
    name: 'cmd',
    arguments: [
      { name: 'arg3', required: true }
    ],
    run() { return }
  })
  isCliCommand({
    name: 'cmd',
    arguments: [
      { name: 'arg4', multiple: true }
    ],
    run() { return }
  })
})

test('only the last argument can be multiple', () => {
  a.throws(() => createCliCommand({
    name: 'cmd',
    arguments: [
      { name: 'arg1', multiple: true },
      { name: 'arg2' }
    ],
    run() { return }
  }, dummyParent), MultipleArgumentNotLastEntry)
})

test('can define boolean options', async () => {
  const { cmd, args, argv } = setupCliCommandTest({
    name: 'cmd',
    options: {
      boolean: { a: { description: 'a' } }
    },
    run(args) { return Promise.resolve(args) }
  }, ['-a', 'true'])

  const actual = await cmd.run(args, argv)
  a.satisfies(actual, { 'a': true })
})

test('can define string options', async () => {
  const { cmd, args, argv } = setupCliCommandTest({
    name: 'cmd',
    options: {
      string: { a: { description: 'a' } }
    },
    run(args) { return Promise.resolve(args) }
  }, ['-a', 'true'])

  const actual = await cmd.run(args, argv)
  a.satisfies(actual, { 'a': 'true' })
})

test('can define number options', async () => {
  const { cmd, args, argv } = setupCliCommandTest({
    name: 'cmd',
    options: {
      number: { a: { description: 'a' } }
    },
    run(args) { return Promise.resolve(args) }
  }, ['-a', '3'])

  const actual = await cmd.run(args, argv)
  a.satisfies(actual, { 'a': 3 })
})

test('can define different options together', async () => {
  const { cmd, args, argv } = setupCliCommandTest({
    name: 'cmd',
    options: {
      boolean: { a: { description: 'a' } },
      string: { b: { description: 'b' } },
      number: { c: { description: 'c' } }
    },
    run(args) { return Promise.resolve(args) }
  }, ['-a', 'true', '-b', 'b', '-c', '3'])

  const actual = await cmd.run(args, argv)
  a.satisfies(actual, { 'a': true, 'b': 'b', 'c': 3 })
})

test('options name are unique across types', () => {
  a.throws(() => createCliCommand({
    name: 'cmd',
    options: {
      boolean: { a: { description: 'a' } },
      string: { a: { description: 'a' } }
    },
    run() { return }
  }, dummyParent), OptionNameNotUnique)

  a.throws(() => createCliCommand({
    name: 'cmd',
    options: {
      boolean: { a: { description: 'a' } },
      number: { a: { description: 'a' } }
    },
    run() { return }
  }, dummyParent), OptionNameNotUnique)

  a.throws(() => createCliCommand({
    name: 'cmd',
    options: {
      string: { a: { description: 'a' } },
      number: { a: { description: 'a' } }
    },
    run() { return }
  }, dummyParent), OptionNameNotUnique)
})

test('can define alias', () => {
  const { cmd } = setupCliCommandTest({
    name: 'cmd',
    alias: ['c'],
    run(args) { return Promise.resolve(args) }
  }, [])

  t.deepStrictEqual(cmd.alias, ['c'])
})

test('create command with sub-commands and no run method', async () => {
  const { cmd, args, argv } = setupCliCommandTest({
    name: 'cmd',
    alias: ['c'],
    commands: [{
      name: 'sub',
      run() { return Promise.resolve(`${this.parent.name}.${this.name}`) }
    }]
  }, [])
  const actual = await cmd.commands![0].run(args, argv)
  t.strictEqual(actual, 'cmd.sub')
})

test('config and context type is available within the run() context', async () => {
  const { cmd, args, argv } = setupCliCommandTest({
    name: 'cmd',
    alias: ['c'],
    run() { return Promise.resolve(`${this.config!.a}.${this.context.b}`) }
  }, [], { a: 'a' }, { b: 'b' })
  const actual = await cmd.run(args, argv)
  t.strictEqual(actual, 'a.b')
})

const dummyParent = {
  name: 'cli',
  config: {},
  context: { cwd: '.', presenterFactory: plainPresenterFactory }
}

function isCliCommand<Config, Context>(cmd: CliCommand<Config, Context>) { return cmd }

// // todo: custom context test is not complete
// test('using custom context', () => {
//   const spec = {
//     name: 'a',
//     run() {
//       t.strictEqual(this.x, undefined)
//     }
//   } as CliCommand<undefined, { x: string }>

//   t(spec)

//   const spec2 = {
//     name: 'b',
//     run() {
//       // `this` should be `Command` by default. Need visual inspection
//       t(this.ui)
//     }
//   } as CliCommand

//   t(spec2)
// })
