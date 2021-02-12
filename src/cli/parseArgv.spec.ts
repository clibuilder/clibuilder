import { argv } from '../test-utils'
import { parseArgv } from './parseArgv'

test('empty', () => {
  testParse('cli', { _: [] })
})
test('spaces are trimmed', () => {
  testParse('cli  ', { _: [] })
})
test('single arg', () => {
  testParse('cli x', { _: ['x'] })
})
test('multiple args', () => {
  testParse('cli x y z', { _: ['x', 'y', 'z'] })
})

test(`---x is captured as '-x'`, () => {
  testParse('cli ---x', { _: [], '-x': ['true'] })
})

describe('options without value', () => {
  test('spaces are trimmed', () => {
    testParse('cli  --abc  ', { _: [], 'abc': ['true'] })
  })
  test('version', () => {
    testParse('cli  --version', { _: [], 'version': ['true'] })
  })
  test(`single option gets ['true']`, () => {
    testParse('cli --abc', { _: [], 'abc': ['true'] })
  })
  test(`multiple options`, () => {
    testParse('cli --abc --abc', { _: [], 'abc': ['true', 'true'] })
  })
  test(`multiple options with multiple spaces in between`, () => {
    testParse('cli --abc   --abc', { _: [], 'abc': ['true', 'true'] })
  })

  describe('single character options', () => {
    test('single option', () => {
      testParse('cli -a', { _: [], 'a': ['true'] })
    })
    test('same options multiple times', () => {
      testParse('cli -a -a', { _: [], 'a': ['true', 'true'] })
    })
    test('multiple single character options', () => {
      testParse('cli -a -b', { _: [], 'a': ['true'], 'b': ['true'] })
    })
    test('multiple options in the same argument expands to individual options', () => {
      testParse('cli -abc', { _: [], 'a': ['true'], 'b': ['true'], 'c': ['true'] })
    })
  })
})

describe('options with value(s)', () => {
  test(`single option with single value`, () => {
    testParse('cli --abc x', { _: [], 'abc': ['x'] })
  })
  test(`single option with multiple values`, () => {
    testParse('cli --abc x y', { _: [], 'abc': ['x', 'y'] })
  })
  test(`single option with single value with multiple spaces`, () => {
    testParse('cli --abc  x  y  ', { _: [], 'abc': ['x', 'y'] })
  })
  test(`multiple options with single value`, () => {
    testParse('cli --abc x --abc y', { _: [], 'abc': ['x', 'y'] })
  })
  test(`multiple options with multiple values`, () => {
    testParse('cli --abc x y --abc p r', { _: [], 'abc': ['x', 'y', 'p', 'r'] })
  })
  test(`multiple options with multiple values with multiple spaces`, () => {
    testParse('cli   --abc  x  y  --abc   p  r   ', { _: [], 'abc': ['x', 'y', 'p', 'r'] })
  })
  test('single option with = syntax', () => {
    testParse('cli --abc=x', { _: [], 'abc': ['x'] })
  })
  test('single option with = syntax without alphanumeric value is treated as argument', () => {
    testParse('cli -=', { _: ['-='] })
  })
  test('single option with = syntax without alphanumeric value is treated as option value', () => {
    testParse('cli --abc -=', { _: [], 'abc': ['-='] })
  })
  test('multiple options with = syntax and multiple values', () => {
    testParse('cli --abc=x b', { _: [], 'abc': ['x', 'b'] })
  })
  test('multiple options with mixed syntax', () => {
    testParse('cli --abc=x --abc b', { _: [], 'abc': ['x', 'b'] })
  })
  test('multiple options with = syntax', () => {
    testParse('cli --abc=x --abc=b', { _: [], 'abc': ['x', 'b'] })
  })
  describe('single character options', () => {
    test('single options with single value', () => {
      testParse('cli -a 123', { _: [], 'a': ['123'] })
    })
    test('single options with single value in = syntax', () => {
      testParse('cli -a=123', { _: [], 'a': ['123'] })
    })
    test('single options with multiple values', () => {
      testParse('cli -a 123 234', { _: [], 'a': ['123', '234'] })
    })
    test('single options with multiple values in = syntax', () => {
      testParse('cli -a=123 234', { _: [], 'a': ['123', '234'] })
    })
    test('single options with single value specified multiple times', () => {
      testParse('cli -a 123 -a 234', { _: [], 'a': ['123', '234'] })
    })
    test('multiple options value is assigned to the last option', () => {
      testParse('cli -abc 123', { _: [], 'a': ['true'], 'b': ['true'], 'c': ['123'] })
    })
    test('multiple short options specified multiple times', () => {
      testParse('cli -abc 123 -abc 456', { _: [], 'a': ['true', 'true'], 'b': ['true', 'true'], 'c': ['123', '456'] })
    })
    test('short options specific with other options together and also repeated will get values combined', () => {
      testParse('cli -abc 123 -a 456', { _: [], 'a': ['true', '456'], 'b': ['true'], 'c': ['123'] })
    })
    test('specify again without value will append true to the values', () => {
      testParse('cli -a 123 -a', { _: [], 'a': ['123', 'true'] })
    })
    test('with = syntax without alphanumeric value is treated as option value', () => {
      testParse('cli -a -=', { _: [], 'a': ['-='] })
    })
  })
})

describe('pipe (--) syntax', () => {
  test('ignore everything after the pipe', () => {
    testParse('cli -- abc', { _: [] })
  })
})

function testParse(input: string, expected: parseArgv.Result) {
  expect(parseArgv(argv(input))).toEqual(expected)
}
