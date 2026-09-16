Feature: Command definition

  A command author states a command once — its name, its inputs, and what it
  does — and the framework reads that one declaration to route, validate, and
  render. This suite fixes what may be declared and what each declaration types
  its `run` arguments as.

  These decisions resolve in the type system, so the verification point is the
  compiler: a scenario passes when the stated `testType` assertion compiles,
  and fails when it does not.

  # ── UC1 — command(): declare a command and infer its run arguments ──

  Scenario: a declaration with run is accepted as a leaf command
    Given a declaration naming a command
    When it declares a run function
    Then the declaration is accepted
    And run's `this` carries the ui, config, keywords, cwd, context, and registry

  Scenario: a declaration with both run and commands is accepted and still types its run
    Given a declaration carrying a run and a commands list
    When the declaration is checked
    Then it is accepted and its run arguments are typed

  Scenario: a declaration with only commands is accepted as a group
    Given a declaration naming a command
    When it declares a list of sub-commands and no run function
    Then the declaration is accepted
    And it types no run arguments

  Scenario: a context on a group declaration is accepted and types nothing
    Given a declaration carrying a commands list and a context, and no run
    When the declaration is checked
    Then it is accepted and no run signature takes the context

  Scenario: a declaration with neither run nor commands is rejected
    Given a declaration naming a command
    When it declares neither a run function nor a list of sub-commands
    Then the declaration is rejected as satisfying neither arm of the command union

  Scenario: a typed argument types as its declared type
    Given a declaration with one argument
    When that argument declares a number type
    Then the run arguments type that argument as a number

  Scenario: an untyped argument types as string
    Given a declaration with one argument
    When that argument omits its type
    Then the run arguments type that argument as a string

  Scenario: a typed option types as its declared type
    Given a declaration with one option whose type is not optional
    When that option declares an array-of-string type
    Then the run arguments type that option as an array of strings

  Scenario: an optionally-typed option types as its type or undefined
    Given a declaration with one option whose type is optional
    When that option declares an optional string type
    Then the run arguments type that option as a string or undefined

  Scenario: an untyped option types as an optional boolean
    Given a declaration with one option
    When that option omits its type
    Then the run arguments type that option as a boolean or undefined

  # Current behavior, and a known gap: Options.Entry's Type parameter is never
  # inferred per entry, so `default` widens to `any` and goes unchecked.
  Scenario: an option default is accepted without being checked against its type
    Given a declaration with one option declaring an array-of-string type
    When it declares a default that is not an array of strings
    Then the declaration is still accepted
    And the run arguments still type that option as an array of strings

  Scenario: help is present on a command that declares no options
    Given a declaration whose options do not include help
    When its run arguments are resolved
    Then help is added implicitly and types as a boolean or undefined

  Scenario: a declared help option replaces the implicit one
    Given a declaration whose options include help
    When that help option declares a string type
    Then the run arguments type help as a string rather than as the implicit boolean

  # ── UC2 — Command.parent: carry a command's place in the tree ──

  Scenario: the internal command type lets a reader reach a parent without a cast
    Given a value typed as the internal command type
    When a sibling capability reads its parent
    Then the parent types as a command that may itself be absent

  Scenario: a declaration writing parent itself is rejected
    Given an author writing a declaration literal
    When the literal sets a parent of its own
    Then the declaration does not type-check
