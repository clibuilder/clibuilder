import a from 'assertron'
import { cli } from './cli'

describe('create', () => {
  test('with options', () => {
    const app = cli({
      name: 'app',
      version: '1.0.0',
      description: 'my app'
    })
    a.satisfies(app, {
      name: 'app',
      version: '1.0.0',
      description: 'my app'
    })
  })
})
