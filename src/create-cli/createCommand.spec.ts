import t from 'assert'
import a from 'assertron'
import { assertType } from 'type-plus'
import { createCliTest, MultipleArgumentNotLastEntry, OptionNameNotUnique } from '..'
import { createCommand } from './createCommand'

test('must specify name, description and run can be () => void', () => {
  createCommand({
    name: 'cmd',
    description: '',
    arguments: [{ name: 'a' }, { name: 'b' }],
    run() {
      return
    },
  })
})

test(`run() can return Promise<any>`, () => {
  createCommand({
    name: 'cmd',
    description: '',
    run() { return Promise.resolve() },
  })

  createCommand({
    name: 'cmd',
    description: '',
    run() { return Promise.resolve(true) },
  })
})

test('`this` in run can access config', async () => {
  const { cli, argv } = createCliTest({
    config: { a: 'a' },
    context: { b: 'b' },
    commands: [{
      name: 'cmd',
      description: '',
      run() {
        return Promise.resolve(this.config!.a + this.b)
      },
    }]
  }, 'cmd')
  expect(await cli.parse(argv)).toBe('ab')
})

test('createCommand() options type inference', () => {
  createCommand({
    name: 'cmd',
    description: '',
    options: {
      boolean: {
        bool: {
          description: 'boolean option'
        },
      },
      string: {
        str: {
          description: 'string option'
        }
      },
      number: {
        num: {
          description: 'number option'
        }
      }
    },
    run(args) {
      assertType<boolean | undefined>(args.bool)
      assertType<string | undefined>(args.str)
      assertType<number | undefined>(args.num)
    }
  })
})

test.todo('argument inference')

test('can define arguments', () => {
  createCommand({
    name: 'cmd',
    description: '',
    arguments: [{ name: 'arg' }],
    run() { return },
  })
  createCommand({
    name: 'cmd',
    description: '',
    arguments: [{ name: 'arg2', description: 'desc' }],
    run() { return },
  })
  createCommand({
    name: 'cmd',
    description: '',
    arguments: [{ name: 'arg3', required: true }],
    run() { return },
  })
  createCommand({
    name: 'cmd',
    description: '',
    arguments: [{ name: 'arg4', multiple: true }],
    run() { return },
  })
})

test('only the last argument can be multiple', () => {
  a.throws(() => createCliTest({
    commands: [{
      name: 'cmd',
      description: '',
      arguments: [
        { name: 'arg1', multiple: true },
        { name: 'arg2' },
      ],
      run() { return }
    }]
  }), MultipleArgumentNotLastEntry)
})

test('can define boolean options', async () => {
  const { cli, argv } = createCliTest({
    commands: [{
      name: 'cmd',
      description: '',
      options: {
        boolean: { a: { description: 'a' } },
      },
      run(args) {
        return Promise.resolve(args)
      },
    }]
  }, 'cmd', '-a', 'true')

  const actual = await cli.parse(argv)
  a.satisfies(actual, { 'a': true })
})

test('can define string options', async () => {
  const { cli, argv } = createCliTest({
    commands: [{
      name: 'cmd',
      description: '',
      options: {
        string: { a: { description: 'a' } },
      },
      run(args) { return Promise.resolve(args) },
    }]
  }, 'cmd', '-a', 'true')

  const actual = await cli.parse(argv)
  a.satisfies(actual, { 'a': 'true' })
})

test('can define number options', async () => {
  const { cli, argv } = createCliTest({
    commands: [{
      name: 'cmd',
      description: '',
      options: {
        number: { a: { description: 'a' } },
      },
      run(args) { return Promise.resolve(args) },
    }]
  }, 'cmd', '-a', '3')

  const actual = await cli.parse(argv)
  a.satisfies(actual, { 'a': 3 })
})

test('can define different options together', async () => {
  const { cli, argv } = createCliTest({
    commands: [{
      name: 'cmd',
      description: '',
      options: {
        boolean: { a: { description: 'a' } },
        string: { b: { description: 'b' } },
        number: { c: { description: 'c' } },
      },
      run(args) { return Promise.resolve(args) },
    }]
  }, 'cmd', '-a', 'true', '-b', 'b', '-c', '3')

  const actual = await cli.parse(argv)
  a.satisfies(actual, { 'a': true, 'b': 'b', 'c': 3 })
})

test('options name are unique across types', () => {
  a.throws(() => createCliTest({
    commands: [{
      name: 'cmd',
      description: '',
      options: {
        boolean: { a: { description: 'a' } },
        string: { a: { description: 'a' } },
      },
      run() { return },
    }]
  }), OptionNameNotUnique)

  a.throws(() => createCliTest({
    commands: [{
      name: 'cmd',
      description: '',
      options: {
        string: { a: { description: 'a' } },
        number: { a: { description: 'a' } },
      },
      run() { return },
    }]
  }), OptionNameNotUnique)
})

test('can define alias', async () => {
  const { cli, argv } = createCliTest({
    commands: [{
      name: 'cmd',
      description: '',
      alias: ['c'],
      run() { return 'called' },
    }]
  }, 'c')
  const actual = await cli.parse(argv)
  expect(actual).toBe('called')
})

test('can create command with sub-commands and no run method', async () => {
  const { cli, argv } = createCliTest({
    commands: [{
      name: 'cmd',
      description: '',
      commands: [{
        name: 'sub',
        description: '',
        run() {
          return Promise.resolve(this.name)
        },
      }],
    }]
  }, 'cmd', 'sub')
  const actual = await cli.parse(argv)

  t.strictEqual(actual, 'sub')
})

test('config and context type is available within the run() context', async () => {
  const { cli, argv } = createCliTest({
    config: { a: 'a' },
    context: { b: 'b' },
    commands: [{
      name: 'cmd',
      description: '',
      run() {
        return Promise.resolve(`${this.config.a}.${this.b}`)
      },
    }]
  }, 'cmd')
  const actual = await cli.parse(argv)
  t.strictEqual(actual, 'a.b')
})

test('specify config type', () => {
  createCommand<{ a: 1 }>({
    name: 'with-config',
    description: '',
    run() {
      assertType<1>(this.config.a)
    }
  })
})

test('properties in `command.context` will be used if not supplied by the cli', async () => {
  const { cli, argv } = createCliTest({
    commands: [{
      name: 'cmd',
      description: '',
      context: { b: 3 },
      run() { return this.b }
    }]
  }, 'cmd')

  const actual = await cli.parse(argv)

  expect(actual).toBe(3)
})
