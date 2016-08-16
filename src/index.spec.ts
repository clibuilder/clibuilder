import test from 'ava'
import { CliBuilder } from './index'

function testProgram(t, pass: string, fail?: string) {
  const program = new CliBuilder()
  program.version = '0.1.0'
  program.log = msg => {
    t.is(msg, pass)
  }
  program.error = msg => {
    if (fail) {
      t.is(msg, fail)
    }
    else {
      t.fail(`ERROR: ${msg}`)
    }
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

test('config command with no action', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', 'config']
  const program = testProgram(t, '', '\nCommand "config" does not have action defined\n')
  program.command('config')
  program.start(argv)
})

test('config command with no action', t => {
  const argv = ['/usr/local/bin/node', '/usr/local/bin/democli', 'config', '-x']
  const program = testProgram(t, '', '\nCommand "config" does not have action defined\n')
  program.command('config')
    .option('-x', 'config option')
    .action((argv, options) => {
      t.is(options.x, true)
    })
  program.start(argv)
})
