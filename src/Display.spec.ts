import { ConsoleDisplay } from './Display';
import test from 'ava'
import * as sinon from 'sinon'

test(`When a prompt be called
a promise will be returned
mock a promise return and resolve it to array`, async t => {
  const fakePrompt = sinon.stub();
  fakePrompt.returns(new Promise((resolve) => resolve(['a', 'b'])));
  const c = new ConsoleDisplay(fakePrompt);

  const r = await c.prompt([{
    type: 'input',
    name: 'first_name',
    message: 'What\'s your first name'
  }]);

  t.true(fakePrompt.called)
  t.true(fakePrompt.calledWithExactly([{
    type: 'input',
    name: 'first_name',
    message: 'What\'s your first name'
  }]))
  t.deepEqual(['a', 'b'], r)

})

test(`When called prompt function with no argument
then a error will be throw`, t => {
  const c = new ConsoleDisplay(sinon.stub());

  t.throws(() => {
    c.prompt()
  });

})


// TODO: test more corner cases
