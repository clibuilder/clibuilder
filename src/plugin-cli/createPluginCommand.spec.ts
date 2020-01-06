import { assertType } from 'type-plus'
import { createPluginCommand } from './createPluginCommand'

test('options inference', () => {
  createPluginCommand({
    name: 'cmd',
    description: '',
    options: {
      boolean: {
        bool: {
          description:'boolean option'
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
      assertType<boolean>(args.bool)
      assertType<string>(args.str)
      assertType<number>(args.num)
    }
  })
})

test.todo('argument inference')
