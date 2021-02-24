import { isType } from 'type-plus'
import * as z from 'zod'
import { command } from './command'

test('when no argument and options, args will have help', () => {
  command({
    name: 'cmd',
    run(args) {
      isType.equal<true, boolean | undefined, typeof args.help>()
    }
  })
})

test('command can override help', () => {
  command({
    name: 'cmd',
    options: { help: { description: 'help with topic', type: z.string() } },
    run(args) {
      isType.equal<true, string, typeof args.help>()
    }
  })
})

test('argument with defined type', () => {
  command({
    name: 'cmd',
    arguments: [{ name: 'arg1', description: 'desc', type: z.number() }],
    run(args) {
      isType.equal<true, number, typeof args.arg1>()
    }
  })
})

test('argument type defaults to string', () => {
  command({
    name: 'cmd',
    arguments: [{ name: 'arg1', description: 'desc' }],
    run(args) {
      isType.equal<true, string, typeof args.arg1>()
    }
  })
})

test('argument of number array', () => {
  command({
    name: 'cmd',
    arguments: [{ name: 'arg1', description: 'desc', type: z.array(z.number()) }],
    run(args) {
      isType.equal<true, number[], typeof args.arg1>()
    }
  })
})

test('multiple arguments with omitted type', () => {
  command({
    name: 'cmd',
    arguments: [
      { name: 'arg1', description: 'desc' },
      { name: 'arg2', description: 'desc', type: z.boolean() }],
    run(args) {
      isType.equal<true, string, typeof args.arg1>()
      isType.equal<true, boolean, typeof args.arg2>()
    }
  })
})

test('option type defaults to boolean', () => {
  command({
    name: 'cmd',
    options: {
      abc: { description: 'abc' }
    },
    run(args) {
      isType.equal<true, boolean | undefined, typeof args.abc>()
    }
  })
})

test('options with type', () => {
  command({
    name: 'cmd',
    options: {
      abc: { description: 'abc', type: z.array(z.string()) }
    },
    run(args) {
      isType.equal<true, string[], typeof args.abc>()
    }
  })
})

test('multiple options with omitted type', () => {
  command({
    name: 'cmd',
    options: {
      abc: { description: 'abc', type: z.array(z.string()) },
      def: { description: 'abc' }
    },
    run(args) {
      isType.equal<true, string[], typeof args.abc>()
      isType.equal<true, boolean | undefined, typeof args.def>()
    }
  })
})

test('with arguments and options', () => {
  command({
    name: 'cmd',
    arguments: [
      { name: 'arg1', description: 'desc' },
      { name: 'arg2', description: 'desc', type: z.boolean() }],
    options: {
      abc: { description: 'abc', type: z.array(z.string()) },
      def: { description: 'abc' }
    },
    run(args) {
      isType.equal<true, string, typeof args.arg1>()
      isType.equal<true, boolean, typeof args.arg2>()
      isType.equal<true, string[], typeof args.abc>()
      isType.equal<true, boolean | undefined, typeof args.def>()
    }
  })
})

test('options with optional type', () => {
  command({
    name: 'cmd',
    options: {
      abc: { description: 'abc', type: z.optional(z.string()) }
    },
    run(args) {
      isType.equal<true, string | undefined, typeof args.abc>()
    }
  })
})
