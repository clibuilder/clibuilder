import { config, createMemoryLogReporter, getLogger, logLevels } from 'standard-log'
import { command, z } from './index.js'
import { getLogMessage } from './test-utils/index.js'
import { createUI } from './ui.js'

describe('showVersion', () => {
  test('undefined version shows "not versioned"', () => {
    const { ui, reporter } = testUI()
    ui.showVersion()
    expect(getLogMessage(reporter)).toEqual('not versioned')
  })
  test('empty version shows "not versioned"', () => {
    const { ui, reporter } = testUI()
    ui.showVersion('')
    expect(getLogMessage(reporter)).toEqual('not versioned')
  })
})

describe('showHelp()', () => {
  test('command with alias', () => {
    const { ui, reporter } = testUI()
    ui.showHelp('cli', command({
      name: 'search-package',
      alias: ['sp'],
      run() { }
    }))
    expect(getLogMessage(reporter)).toEqual(`
Usage: cli search-package

Alias:
  sp
`)
  })
  test('with sub-commands', () => {
    const { ui, reporter } = testUI()
    ui.showHelp('cli', command({
      name: 'cmd',
      commands: [command({
        name: 'sub',
        run() { }
      })]
    }))
    expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd <command>

Commands:
  sub

cmd <command> -h         Get help for <command>
`)
  })
  test('sub command with alias', () => {
    const { ui, reporter } = testUI()
    ui.showHelp('cli', command({
      name: 'repo',
      commands: [{
        name: 'search-package',
        alias: ['sp'],
        run() { }
      }]
    }))
    expect(getLogMessage(reporter)).toEqual(`
Usage: cli repo <command>

Commands:
  search-package (sp)

repo <command> -h        Get help for <command>
`)
  })
  test('required argument', () => {
    const { ui, reporter } = testUI()
    ui.showHelp('cli', command({
      name: 'cmd',
      arguments: [{ name: 'x', description: '' }],
      run() { }
    }))
    expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd <arguments>

Arguments:
  <x>
`)
  })
  test('optional argument', () => {
    const { ui, reporter } = testUI()
    ui.showHelp('cli', command({
      name: 'cmd',
      arguments: [{ name: 'x', description: '', type: z.optional(z.string()) }],
      run() { }
    }))
    expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd [arguments]

Arguments:
  [x]
`)
  })
  describe('options', () => {
    test('default (optional boolean)', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        options: {
          'abc': { description: 'desc' }
        },
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd [options]

Options:
  [--abc]                desc
`)
    })
    test('required string', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        options: {
          'abc': { description: 'desc', type: z.string() }
        },
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc>=string         desc
`)
    })
    test('required number', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        options: {
          'abc': { description: 'desc', type: z.number() }
        },
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc>=number         desc
`)
    })
    test('required boolean', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        options: {
          'abc': { description: 'desc', type: z.boolean() }
        },
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc>                desc
`)
    })
    test('required string array', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        options: {
          'abc': { description: 'desc', type: z.array(z.string()) }
        },
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc>=string...      desc
`)
    })
    test('required number array', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        options: {
          'abc': { description: 'desc', type: z.array(z.number()) }
        },
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc>=number...      desc
`)
    })
    test('required boolean array', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        options: {
          'abc': { description: 'desc', type: z.array(z.boolean()) }
        },
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc>=boolean...     desc
`)
    })
    test('with default', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        options: {
          'abc': { description: 'desc', type: z.string(), default: 'miku' }
        },
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd <options>

Options:
  <--abc>=string         desc (default 'miku')
`)
    })
    test('options with single string alias', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        options: {
          long: { description: 'description', alias: ['l'] }
        },
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd [options]

Options:
  [-l|--long]            description
`)
    })
    test('options with hidden alias', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        options: {
          long: {
            type: z.optional(z.string()),
            description: 'description',
            alias: [
              { alias: 'l', hidden: true },
              { alias: 'h', hidden: false },
            ]
          }
        },
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd [options]

Options:
  [-h|--long]=string     description
`)
    })
  })

  describe('config', () => {
    test('{ a: string }', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        config: z.object({ a: z.string() }),
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd

Config:
{ a: string }
`)
    })
    test('{ a: string, b: boolean }', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        config: z.object({ a: z.string(), b: z.boolean() }),
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd

Config:
{ a: string, b: boolean }
`)
    })
    test('{ c: number }', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        config: z.object({ c: z.number() }),
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd

Config:
{ c: number }
`)
    })
    test('{ c?: string[] }', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        config: z.object({ c: z.optional(z.array(z.string())) }),
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd

Config:
{ c?: string[] }
`)
    })
    test('{ a: Array<{ d: string }> }', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        config: z.object({ a: z.array(z.object({ d: z.string() })) }),
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd

Config:
{ a: Array<{ d: string }> }
`)
    })
    test('{ a?: Array<{ d?: string }> }', () => {
      const { ui, reporter } = testUI()
      ui.showHelp('cli', command({
        name: 'cmd',
        config: z.object({
          a: z.array(z.object({
            d: z.string().optional()
          })).optional()
        }),
        run() { }
      }))
      expect(getLogMessage(reporter)).toEqual(`
Usage: cli cmd

Config:
{ a?: Array<{ d?: string }> }
`)
    })
  })
})

function testUI() {
  const reporter = createMemoryLogReporter({ id: 'mock-reporter' })
  config({
    logLevel: logLevels.all,
    reporters: [reporter],
    mode: 'test'
  })
  const log = getLogger('mock-ui', { level: logLevels.all, writeTo: 'mock-reporter' })
  return { ui: createUI(log), reporter }
}

