import test from 'ava'
import Order from 'assert-order'
import { createEvent } from 'fsa-emitter';

import { Task } from './Task'
import { setupTaskTest } from './test-util/setup'

test('task runner can run task', t => {
  const event = createEvent('event')
  class TestTask extends Task {
    run() {
      this.emitter.emit(event(undefined, undefined))
    }
  }

  const order = new Order(1)
  const { runner } = setupTaskTest(TestTask, (emitter) => {
    emitter.addListener(event, () => {
      order.once(1)
    })
  })
  runner.run()
  order.end()
  t.pass()
})

test('resulting run method has the same signature as the Task', t => {
  const order = new Order(1)
  class TestArgTask extends Task {
    run(name: string) {
      order.once(1)
      t.is(name, 'input')
    }
  }

  const { runner } = setupTaskTest(TestArgTask)

  // `runner.run(name: string)`
  runner.run('input')

  order.end()
})
