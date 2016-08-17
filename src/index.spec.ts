import test from 'ava'
import { CliBuilder } from './index'

function testProgram(t, pass?: string, fail?: string) {
  const program = new CliBuilder()
  program.version = '0.1.0'
  program.log = msg => {
    console.log(msg)
    t.is(msg, pass)
  }
  program.error = msg => {
    // console.error(msg)
    t.is(msg, fail)
  }
  return program
}

test('default help', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli']
  const program = testProgram(t, '\nUsage: democli\n\nOptions:\n-h, --help     output usage information\n-v, --version  output the version number\n\ndemocli@0.1.0 /usr/local/bin\n')
  program.start(argv)
})

test('custom help', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli']
  const program = testProgram(t, '\nUsage: democli\n')
  program.programHelpTemplate = '\n<usage>'
  program.start(argv)
})

test('--help', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', '--help']
  const program = testProgram(t, '\nUsage: democli\n\nOptions:\n-h, --help     output usage information\n-v, --version  output the version number\n\ndemocli@0.1.0 /usr/local/bin\n')
  program.start(argv)
})

test('-h', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', '-h']
  const program = testProgram(t, '\nUsage: democli\n\nOptions:\n-h, --help     output usage information\n-v, --version  output the version number\n\ndemocli@0.1.0 /usr/local/bin\n')
  program.start(argv)
})

test('-v', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', '-v']
  const program = testProgram(t, '0.1.0')
  program.start(argv)
})

test('--version', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', '--version']
  const program = testProgram(t, '0.1.0')
  program.start(argv)
})

test('unknown option', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', '--unknown']
  const program = testProgram(t, '\nUsage: democli\n\nOptions:\n-h, --help     output usage information\n-v, --version  output the version number\n\ndemocli@0.1.0 /usr/local/bin\n', '\nUnknown option "--unknown"\n')

  t.plan(2)
  program.start(argv)
})

test('override default command', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', '-r']
  const program = testProgram(t, '\nUsage: democli\n\nOptions:\n-r  custom option\n\ndemocli@0.1.0 /usr/local/bin\n')
  program.command()
    .option('-r', 'custom option')
    .action((args, options) => {
      return false
    })
  program.start(argv)
})

test('unknown command', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', 'unknown']
  const program = testProgram(t, undefined, '\nUnknown command "unknown"\n')
  program.command('config')
  program.start(argv)
})

test('command with no action shows command help', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', 'config']
  const program = testProgram(t, '\nUsage: democli config\n\nThis command has not been defined.')
  program.command('config')

  t.plan(1)
  program.start(argv)
})
test('command help', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', 'config']
  const program = testProgram(t, '\nUsage: democli config\n\nOptions:\n-x  config option\n')
  program.command('other')
  program.command('config')
    .option('-x', 'config option')
    .action((argv, options) => {
      return false
    })
  program.command('other2')
  program.start(argv)
})

test('command with option', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', 'config', '-x']
  const program = testProgram(t, '\nUsage: democli config\n\nOptions:\n-x  config option\n')
  program.command('config')
    .option('-x', 'config option')
    .action((argv, options) => {
      t.is(options.x, true)
      return false
    })
  program.start(argv)
})

test('base help with command', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli']
  const program = testProgram(t, '\nUsage: democli <command>\n\nCommands:\n    config\n\nOptions:\n-h, --help     output usage information\n-v, --version  output the version number\n\ndemocli@0.1.0 /usr/local/bin\n')
  program.command('config')
    .action((argv, options) => {
      t.is(options.x, true)
      return false
    })
  program.start(argv)
})

test('argument', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', 'file.txt']
  const program = testProgram(t, '\nUsage: democli\n\nArguments:\n<file name>  File to blow up\n\ndemocli@0.1.0 /usr/local/bin\n')

  t.plan(2)
  program.command()
    .argument('<file name>', 'File to blow up')
    .action((arg) => {
      t.is(arg.fileName, 'file.txt')
      return false
    })
  program.start(argv)
})

test('argument choices', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli']
  const program = testProgram(t, '\nUsage: democli\n\nArguments:\n<feature>      feature to add.\n  f1           feature 1\n  feature-abc  feature abc\n\ndemocli@0.1.0 /usr/local/bin\n')

  t.plan(1)
  program.command()
    .argument('<feature>', 'feature to add.', {
      f1: 'feature 1',
      'feature-abc': 'feature abc'
    })
    .action((arg) => {
      return false
    })
  program.start(argv)
})

test('variadic arguments', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', 'file.txt', 'file2.txt']
  const program = testProgram(t, '\nUsage: democli\n\nArguments:\n<file names...>  File to blow up\n\ndemocli@0.1.0 /usr/local/bin\n')

  t.plan(4)
  program.command()
    .argument('<file names...>', 'File to blow up')
    .action((arg) => {
      t.is(arg.fileNames.length, 2)
      t.is(arg.fileNames[0], 'file.txt')
      t.is(arg.fileNames[1], 'file2.txt')
      return false
    })
  program.start(argv)
})

test('option name with dash', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', '--some-thing']
  const program = testProgram(t, '\nUsage: democli\n\Options:\n-m, --mode <mode>  Override setup mode to use.\n\ndemocli@0.1.0 /usr/local/bin\n')
  program.command()
    .option('--some-thing', 'Some thing')
    .action((args, options) => {
      t.is(options.someThing, true)
    })
  program.start(argv)
})

test('option', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', '-m', 'no-prompt']
  const program = testProgram(t, '\nUsage: democli\n\nOptions:\n-m, --mode <mode>  Override setup mode to use.\n  no-prompt        Skip prompt\n  no-test          Do not install test\n  with-test        Setup with test\n\ndemocli@0.1.0 /usr/local/bin\n')

  t.plan(2)
  program.command()
    .option('-m, --mode <mode>', 'Override setup mode to use.', {
      'no-prompt': 'Skip prompt',
      'no-test': 'Do not install test',
      'with-test': 'Setup with test'
    })
    .action((args, options) => {
      t.is(options.mode, 'no-prompt')
      return false
    })
  program.start(argv)
})
