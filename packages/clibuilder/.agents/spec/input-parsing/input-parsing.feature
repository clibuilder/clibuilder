Feature: Input parsing

  Turn an argv vector into the command the user meant, the values they meant,
  and a list of everything that was wrong with the invocation. Tokenizing knows
  nothing about the declaration and never reports an error; only filling, which
  reads the declaration, can judge an input wrong. Errors are collected rather
  than thrown, so one pass reports every mistake.

  # ── UC1 — parseArgv: classify an argv vector ──

  Scenario: a long option written with = takes the text after it as its value
    Given an argv vector
    When it contains a long option written with an equals sign
    Then the text after the equals sign is that option's value

  Scenario: a long option takes the following token as its value
    Given a long option with no equals sign
    When the next token is not itself an option
    Then that token is the option's value

  Scenario: an option given no value becomes true
    Given an option is opened
    When it is the last token, or the next token opens another option
    Then the option's value is the string true

  Scenario: an option repeated accumulates its values
    Given an argv vector
    When the same option key is opened more than once
    Then the option holds every value given to it, in order

  Scenario: a single-dash cluster sets every character but the last to true
    Given a single-dash token of several characters
    When it is tokenized
    Then every character but the last is an option with the value true
    And the last character opens for values

  Scenario: a single-dash cluster with = gives its value to the last character
    Given a single-dash token of several characters containing an equals sign
    When it is tokenized
    Then the text after the equals sign belongs to the last character before it

  Scenario: a bare token is a positional
    Given no option is awaiting values
    When a token that does not begin with a dash arrives
    Then it is appended to the positionals

  Scenario: a lone dash is a positional, not an option
    Given no option is awaiting values
    When the token is a single dash with no word character
    Then it is appended to the positionals

  # Current behavior, and a known gap: a negative number cannot be given as a value.
  Scenario: a negative number opens an option named by its digits
    Given no option is awaiting values
    When the token is a dash followed by digits
    Then an option named by those digits is opened

  Scenario: a terminator collects every following token raw
    Given no option is awaiting values
    When the terminator arrives
    Then every token after it is collected raw, unclassified

  # Current behavior, and a known gap: the option-state branch claims the
  # terminator before the terminator branch is reached.
  Scenario: a terminator arriving while an option is open becomes that option's value
    Given an option is awaiting values
    When the terminator arrives
    Then it is appended as that option's value
    And no terminator is opened

  Scenario: a token shaped like an option after the terminator is kept raw
    Given the terminator has already been opened
    When a token that looks like an option arrives
    Then it is collected raw rather than opening an option

  # ── UC2 — lookupCommand, matching ──

  Scenario: an invocation naming a sub-command matches it and consumes its name
    Given a command declaring a sub-command
    When the first positional is that sub-command's name
    Then the sub-command is the match
    And its name is consumed, leaving the rest for its own arguments

  Scenario: an invocation naming a sub-command's alias matches it
    Given a command declaring a sub-command with an alias
    When the first positional is that alias
    Then the sub-command is the match

  Scenario: an invocation naming no sub-command matches the command itself
    Given a command declaring sub-commands
    When the first positional names none of them
    Then the command itself is the match
    And the positionals are left for its own arguments

  Scenario: a nameless sub-command matches without consuming a positional
    Given a command whose sub-commands are a nameless one followed by named ones
    When the first positional names none of the named sub-commands
    Then the nameless sub-command is the match
    And no positional is consumed

  Scenario: a nameless sub-command declared last shadows its named siblings
    Given a command whose sub-commands end with a nameless one
    When the first positional names one of the named sub-commands
    Then the nameless sub-command is still the match

  Scenario: an invocation naming a nested path matches the deepest command
    Given a sub-command that itself declares sub-commands
    When the invocation names the full path
    Then the deepest named command is the match

  Scenario: the later of two sub-commands sharing a name wins
    Given a command declaring two sub-commands under the same name
    When the invocation names that name
    Then the later-declared sub-command is the match

  # ── UC2 — lookupCommand, filling ──

  Scenario: a declared argument takes the next positional
    Given a command declaring an argument whose type is not an array
    When a positional is available
    Then the argument takes that one positional

  Scenario: an array argument consumes every remaining positional
    Given a command declaring an argument with an array type
    When several positionals remain
    Then the argument holds all of them

  Scenario: a required argument with nothing left reports it missing
    Given a command declaring an argument whose type is not optional
    When no positional remains for it
    Then a missing-argument error names it

  Scenario: an optional argument with nothing left is skipped without error
    Given a command declaring an argument whose type is optional
    When no positional remains for it
    Then it is skipped and no error is reported

  Scenario: positionals left over after every argument are reported as extra
    Given every declared argument has been filled
    When positionals still remain
    Then an extra-arguments error carries them

  Scenario: an argument declaring no type is filled as a string
    Given a command declaring an argument with no type
    When a positional fills it
    Then its value is that positional unchanged

  Scenario: the positionals key is not reported as an unknown option
    Given a command whose invocation gives positionals
    When the options are filled from the tokenized args
    Then no invalid-key error names the positionals key

  Scenario: an option key matching a declared name is filled
    Given a command declaring an option
    When the invocation gives that option by name
    Then its converted value is set under that name

  Scenario: an option key matching an alias is filled under the declared name
    Given a command declaring an option with an alias
    When the invocation gives that option by its alias
    Then its converted value is set under the option's declared name, not the alias

  Scenario: an unknown option key is reported as invalid
    Given a command declaring options
    When the invocation gives a key matching no name or alias
    Then an invalid-key error names that key

  Scenario: an option written with three dashes is reported as invalid
    Given an invocation writing an option with more dashes than a long option takes
    When its inputs are filled
    Then an invalid-key error names the key with its leading dash retained

  # Current behavior, and a known gap: the terminator remainder never reaches run.
  Scenario: an invocation using the terminator reports it as an invalid key
    Given an invocation using the terminator
    When its inputs are filled
    Then an invalid-key error names the terminator's key
    And the raw remainder is not among the filled inputs

  Scenario: an option declaring no type is filled as an optional boolean
    Given a command declaring an option with no type
    When the invocation gives that option with no value
    Then its value is true

  Scenario: an absent option falls back to its declared default
    Given a command declaring an option with a default
    When the invocation does not give that option
    Then its value is the declared default

  Scenario: a scalar default on an array option is wrapped in an array
    Given a command declaring an option with an array type and a scalar default
    When the invocation does not give that option
    Then its value is the default wrapped in an array

  Scenario: an option given in argv is not overwritten by its default
    Given a command declaring an option with a default
    When the invocation gives that option a value
    Then its value is the one given, not the default

  # ── UC2 — lookupCommand, converting ──

  Scenario: a boolean option accepts true and false
    Given a command declaring a boolean option
    When the invocation gives it the word true or the word false
    Then its value is the matching boolean

  Scenario: a boolean option given another word is rejected as not a boolean
    Given a command declaring a boolean option
    When the invocation gives it a word that is neither true nor false
    Then an invalid-value error says it expected a boolean

  Scenario: a number option accepts a numeric value
    Given a command declaring a number option
    When the invocation gives it a value that reads as a number
    Then its value is that number

  Scenario: a number option given a non-numeric value is rejected as not a number
    Given a command declaring a number option
    When the invocation gives it a value that does not read as a number
    Then an invalid-value error says it expected a number

  Scenario: a string option takes its value as typed
    Given a command declaring a string option
    When the invocation gives it a value
    Then its value is that text unchanged

  Scenario: an array option converts each of its values by the element type
    Given a command declaring an option with an array type
    When the invocation gives it several values
    Then each value is converted by the array's element type

  Scenario: an optional option converts by the type it wraps
    Given a command declaring an option with an optional type
    When the invocation gives it a value
    Then the value is converted by the type inside the optional

  Scenario: several values for a single-valued option are reported, and the last one is used
    Given a command declaring an option whose type holds a single value
    When the invocation gives it more than one value
    Then an expect-single error names the option
    And the last value given is the one used

  Scenario: an enum option given one of its declared values is accepted as typed
    Given a command declaring an option with an enum type
    When the invocation gives it a value the enum lists
    Then the command runs with that value, and no error is reported

  Scenario: an enum option given an unlisted value is told which values it accepts
    Given a command declaring an option with an enum type
    When the invocation gives it a value the enum does not list
    Then an invalid-value error lists the values the option accepts

  Scenario: a value the schema rejects is reported in the schema's own words
    Given a command declaring an option whose type is not an enum
    When the schema rejects the value and no conversion error was recorded
    Then an invalid-value error carries the schema's own message

  Scenario: a value the conversion rejected is reported once, not twice
    Given a command declaring a number option
    When the invocation gives it a value that is not a number
    Then exactly one error is reported for that option

  # ── UC3 — lookupOptions: decide whether a key names a declared option ──

  Scenario: a key matching a declared name resolves to that option
    Given a command declaring an option
    When that option's name is looked up
    Then the option and its name are returned

  Scenario: a key matching an alias resolves to the option's declared name
    Given a command declaring an option with an alias written as a plain string
    When that alias is looked up
    Then the option is returned under its declared name

  Scenario: a key matching a hidden alias resolves like any other alias
    Given a command declaring an option with an alias written in its hidden form
    When that alias is looked up
    Then the option is returned under its declared name

  Scenario: a key looked up on a command declaring no options resolves to nothing
    Given a command declaring no options at all
    When any key is looked up
    Then nothing is returned

  Scenario: a key matching neither a name nor an alias resolves to nothing
    Given a command declaring options, none named or aliased by the key
    When the key is looked up
    Then nothing is returned
