Feature: Option parsing with descriptors

  A descriptor from t converts the raw argument to a typed value and carries
  its constraints as data. A check validates the converted value and never
  changes it. Failures the caller can fix are a ParseArgsError; anything else
  propagates.

  # ── Conversion ──

  Scenario: a number descriptor converts strictly
    Given an option declared with t.number()
    When its value is empty, NaN, Infinity or has trailing text
    Then parsing throws a ParseArgsError of kind invalid-value

  Scenario: an int descriptor enforces its bounds
    Given an option declared with t.int({ min: 1, max: 65535 })
    When its value is 0
    Then parsing throws a ParseArgsError of kind invalid-value
    And the message says it expected an integer from 1 to 65535

  Scenario: a numeric descriptor takes a negative number as the next argument
    Given an option declared with t.int()
    When it is followed by the argument -5
    Then the option's value is -5

  Scenario: a boolean descriptor takes no value
    Given an option declared with t.boolean()
    When it is followed by a positional argument
    Then the option is true
    And the argument stays a positional

  Scenario: an enum descriptor accepts only its values
    Given an option declared with t.enum(['a', 'b'])
    When its value is c
    Then parsing throws a ParseArgsError of kind invalid-value naming the values

  Scenario: a required descriptor option is absent
    Given an option declared with a descriptor that is not optional and has no default
    When the option is not given
    Then parsing throws a ParseArgsError of kind missing-option

  Scenario: an optional descriptor option is absent
    Given an option declared with a descriptor marked .optional()
    When the option is not given
    Then the option is absent from the result

  # ── Arrays ──

  Scenario: an array collects every occurrence in order
    Given an option declared with t.array(t.int())
    When the option is given three times
    Then its value is the three converted values in source order

  Scenario: an array names the failing element by its index
    Given an option tag declared with t.array(t.enum(['a', 'b']))
    When its third occurrence has an invalid value
    Then the error names tag[2] and its index is 2

  Scenario: an array element may be a custom or json descriptor
    Given an option declared with t.array(t.custom(convert))
    When the option is given twice
    Then each value is converted by convert, in order

  # ── Checks ──

  Scenario: a check returns a message
    Given an option whose descriptor has a check returning 'must be even'
    When the converted value fails the check
    Then parsing throws a ParseArgsError of kind invalid-value with the message must be even

  Scenario: the first failing check wins
    Given a descriptor with two checks that both fail
    When the option is parsed
    Then only the first check runs and its failure is reported

  Scenario: a Standard Schema check ignores the schema output
    Given an option whose check is a schema that transforms its value
    When the value passes the schema
    Then the option's value is the converted value, not the schema output

  Scenario: a Standard Schema check's text is not forwarded
    Given an option whose check is a schema that fails
    When the option is parsed
    Then the error message is the package's own
    And the schema's issues are on the error's issues

  Scenario: a check that throws propagates
    Given a check that throws
    When the option is parsed
    Then the thrown error propagates unchanged

  # ── Conversion hooks ──

  Scenario: a custom converter throws a plain Error
    Given an option declared with t.custom(convert)
    When convert throws an Error whose constructor is Error
    Then parsing throws a ParseArgsError of kind invalid-value with that message

  Scenario: a custom converter throws anything else
    Given an option declared with t.custom(convert)
    When convert throws a TypeError, a subclass of Error, or a non-Error value
    Then that value propagates unchanged

  Scenario: json text that does not parse
    Given an option declared with t.json()
    When its value is not valid JSON
    Then parsing throws a ParseArgsError of kind invalid-value saying it is not valid JSON

  Scenario: json validated by a schema uses the schema output
    Given an option declared with t.json(schema)
    When the JSON passes the schema
    Then the option's value is the schema's output

  # ── Defaults ──

  Scenario: a default is not converted and its checks run once
    Given a descriptor option with a default and a check
    When it is parsed twice without the option
    Then the value is the default both times
    And the check ran once

  Scenario: a default that fails its check
    Given a descriptor option whose default fails its check
    When it is parsed without the option
    Then parsing throws a plain Error, not a ParseArgsError

  # ── Async ──

  Scenario: parseArgs meets an asynchronous converter
    Given an option whose converter returns a promise
    When it is parsed with parseArgs
    Then parsing throws an Error naming the option and parseArgsAsync

  Scenario: parseArgsAsync awaits converters and checks in order
    Given options with asynchronous converters and checks
    When they are parsed with parseArgsAsync
    Then each is awaited in input order and the result has the converted values

  # ── Definitions ──

  Scenario: an invalid definition throws when built
    Given a builder call with min greater than max, a fractional t.int bound, an empty t.enum, or a non-scalar t.literal
    When the descriptor is built
    Then it throws

  Scenario: a descriptor from another copy of args-minus is accepted
    Given a descriptor built by a second copy of args-minus with the same descriptor format
    When it is checked with isDescriptor, declared as an option type, or passed to t.array
    Then it is a descriptor and parses like one built by this copy

  Scenario: a descriptor of another format version is rejected
    Given a value branded as a descriptor of a different format version
    When it is checked with isDescriptor or passed to t.array
    Then it is not a descriptor and t.array throws

  # ── Error fields ──

  Scenario: a ParseArgsError names the raw value and what was wrong apart from its message
    Given an option whose value fails conversion, a constraint or a check
    When it is parsed
    Then the ParseArgsError's value is the raw value as typed, or undefined when none was given
    And its detail is what was expected, the check's message or the converter's message, without the option and input framing

  Scenario: an inline value keeps every equals sign after the first
    Given an option written as --opt=a=b
    When it is tokenized
    Then its value is a=b
