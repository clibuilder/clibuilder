@frozen
Feature: Presentation

  Everything the cli says. Messages are buffered until argv has settled how
  much to say, then replayed. Help is generated from the declaration rather
  than written by hand. Answers are encoded in the format the reader asked for,
  defaulting to the structured one because a cli's own metadata is read by an
  agent more often than by a person.

  # ── UC1 — createBuilderUI: say things before the level is known ──

  Scenario: a message emitted before the level is settled is held rather than printed
    Given the display level has not been settled
    When a message is emitted
    Then it is held rather than printed

  Scenario: dumping replays every held message in order and at its own level
    Given several messages held at different levels
    When the buffer is dumped
    Then each is printed in the order it was emitted, at the level it was emitted at

  Scenario: a message emitted after dumping is printed straight away
    Given the buffer has been dumped
    When another message is emitted
    Then it is printed without being held

  # ── UC2 — the display level ──

  Scenario: setting the level to none silences the logger
    Given a ui
    When its display level is set to none
    Then nothing is reported

  Scenario: setting the level to debug shows debug messages
    Given a ui
    When its display level is set to debug
    Then debug messages are reported

  Scenario: setting the level to trace shows trace messages
    Given a ui
    When its display level is set to trace
    Then trace messages are reported

  # Current behavior: the setter has cases for none, debug, and trace only.
  Scenario: setting the level to info changes nothing
    Given a ui whose level has been raised
    When its display level is set to info
    Then the level is unchanged, because no case matches

  Scenario: a ui reports info before any level is set
    Given a ui whose level has not been set
    When the level is read back
    Then it reports info

  Scenario: reading the level back after silencing reports none
    Given a ui whose level has been set to none
    When the level is read back
    Then it reports none

  Scenario: reading the level back after raising to debug reports debug
    Given a ui whose level has been set to debug
    When the level is read back
    Then it reports debug

  Scenario: reading the level back after raising to trace reports trace
    Given a ui whose level has been set to trace
    When the level is read back
    Then it reports trace

  Scenario: setting the level to info leaves a level already raised where it was
    Given a ui whose level has been set to debug
    When the level is set to info
    Then reading the level back still reports debug

  # ── UC3 — showHelp: render help from the declaration ──

  Scenario: usage names the whole chain from the application through every ancestor
    Given a command nested beneath another
    When its help is shown
    Then usage names the application, then each ancestor, then the command

  Scenario: usage says a command is expected when the command has sub-commands
    Given a command declaring sub-commands
    When its help is shown
    Then usage shows that a command is expected

  Scenario: usage marks arguments as required when any of them is
    Given a command declaring at least one required argument
    When its help is shown
    Then usage marks the arguments as required

  Scenario: usage marks arguments as optional when none of them is required
    Given a command whose declared arguments are all optional
    When its help is shown
    Then usage marks the arguments as optional

  Scenario: usage marks options as required when any of them is
    Given a command declaring at least one required option
    When its help is shown
    Then usage marks the options as required

  Scenario: usage marks options as optional when none of them is required
    Given a command whose declared options are all optional
    When its help is shown
    Then usage marks the options as optional

  Scenario: a declared description is shown
    Given a command declaring a description
    When its help is shown
    Then the description appears

  Scenario: sub-commands are listed with their aliases
    Given a command declaring sub-commands, some carrying aliases
    When its help is shown
    Then each sub-command is listed, and those with aliases show them

  Scenario: declared arguments are listed with their descriptions, aligned
    Given a command declaring arguments
    When its help is shown
    Then each argument appears with its description, in an aligned column

  Scenario: declared options are listed with their descriptions, aligned
    Given a command declaring options
    When its help is shown
    Then each option appears with its description, in an aligned column

  Scenario: a command's own aliases are shown
    Given a command declaring aliases of its own
    When its help is shown
    Then those aliases appear

  Scenario: a declared config schema is shown as a type
    Given a command declaring a config schema
    When its help is shown
    Then the shape its JSON Schema describes appears as a readable type

  Scenario: usage says nothing about a command when none are declared
    Given a command declaring no sub-commands
    When its help is rendered
    Then the usage line carries no command placeholder

  Scenario: usage carries no argument group when none are declared
    Given a command declaring no arguments
    When its help is rendered
    Then the usage line carries neither an angle-bracketed nor a square-bracketed argument group

  Scenario: usage carries no option group when none are declared
    Given a command declaring no options
    When its help is rendered
    Then the usage line carries neither an angle-bracketed nor a square-bracketed option group

  Scenario: a command with no description shows no description section
    Given a command declaring no description
    When its help is rendered
    Then no description section appears

  Scenario: a command with no sub-commands shows no commands section
    Given a command declaring no sub-commands
    When its help is rendered
    Then no commands section appears

  Scenario: a section with nothing to show is left out rather than rendered empty
    Given a command declaring no arguments, options, aliases, or config
    When its help is shown
    Then those sections do not appear at all

  # ── UC4 — the signature format ──

  Scenario: an argument with no type is shown as required
    Given an argument declaring no type
    When its signature is rendered
    Then it is shown as required

  Scenario: an option with no type is shown as optional
    Given an option declaring no type
    When its signature is rendered
    Then it is shown as optional

  Scenario: an optional type is shown in square brackets
    Given a declared optional type
    When its signature is rendered
    Then the name is wrapped in square brackets

  Scenario: a required type is shown in angle brackets
    Given a declared type that is not optional
    When its signature is rendered
    Then the name is wrapped in angle brackets

  Scenario: no type declared shows no hint beside the name
    Given an argument or option declaring no type at all
    When its signature is rendered
    Then the name carries no type hint, only its brackets: <name> for an argument and [--flag] for an option

  Scenario: a string or number type is hinted beside the name
    Given an option or argument declaring a string or number type
    When its signature is rendered
    Then the type is hinted beside the name, such as [--name <string>] or <x: number>

  Scenario: an array type is marked variadic
    Given an option or argument declaring an array type
    When its signature is rendered
    Then it carries a variadic marker, such as --abc <string>... or [x: number...]

  Scenario: a boolean option is shown without a type hint, because it is a flag
    Given an option declaring a boolean type
    When its signature is rendered
    Then no type hint is shown

  Scenario: a boolean argument keeps its type hint, because it must be typed out
    Given an argument declaring a boolean type
    When its signature is rendered
    Then the type is hinted beside the name

  Scenario: an option's aliases are shown with it, shortest first and dashed by length
    Given an option declaring aliases
    When its signature is rendered
    Then the aliases and the name appear together, shortest first, each dashed by its own length

  Scenario: an option with no aliases shows just its name
    Given an option declaring no aliases
    When its help entry is rendered
    Then the entry carries its name alone, with no alias marker appended

  Scenario: an option with no default shows just its description
    Given an option declaring no default
    When its help entry is rendered
    Then the entry carries its description alone, with no default appended

  Scenario: a hidden alias is not shown
    Given an option declaring an alias marked hidden
    When its signature is rendered
    Then that alias does not appear

  Scenario: an option's default is named in its description
    Given an option declaring a non-string default
    When its help entry is rendered
    Then the description names the default as written, without quotes

  Scenario: a string default is quoted in the description
    Given an option declaring a string type and a default, such as the global --format
    When its help entry is rendered
    Then the default appears quoted, such as (default 'toon')

  # ── UC5 — showVersion ──

  Scenario: an application with a version prints it
    Given an application built with a version
    When its version is shown
    Then the version is printed

  Scenario: an application without a version says so rather than printing nothing
    Given an application built without a version
    When its version is shown
    Then it reports that there is no version

  # ── UC7 — describing a usage error ──

  Scenario: an unknown single-character option is described with one dash
    Given an unknown option key of one character
    When the error is described
    Then the key is shown with a single dash

  Scenario: an unknown multi-character option is described with two dashes
    Given an unknown option key of several characters
    When the error is described
    Then the key is shown with two dashes

  Scenario: a missing argument is described by its name in angle brackets
    Given a missing-argument error
    When it is described
    Then the argument's name is shown in angle brackets

  Scenario: one unexpected argument is described in the singular
    Given an extra-arguments error carrying one value
    When it is described
    Then it reads as a single unexpected argument

  Scenario: several unexpected arguments are described in the plural
    Given an extra-arguments error carrying several values
    When it is described
    Then it reads as several unexpected arguments

  Scenario: an invalid value on an argument is described as an argument
    Given an invalid-value error whose key is a declared argument
    When it is described
    Then it names an argument rather than an option

  Scenario: an invalid value on an option is described as an option
    Given an invalid-value error whose key is not a declared argument
    When it is described
    Then it names an option rather than an argument

  Scenario: too many values are described with the values that were given
    Given an expect-single error
    When it is described
    Then it names an option rather than an argument, says a single value was expected, and lists the values received

  # ── UC3 — the two ui shapes ──

  Scenario: the ui a command author calls needs no arguments to show help
    Given the ui port a command author programs against
    When its showHelp and showVersion are inspected
    Then neither takes an argument

  Scenario: the ui createUI returns is told what to render
    Given the ui createUI returns
    When its showHelp is inspected
    Then it takes the cli name and the command to render

  # ── Help and errors for declarations with t ──

  Scenario: help shows the constraint of a t option or argument
    Given a command declaring options and arguments with t
    When its help is rendered
    Then each value-taking option shows its constraint, such as --port <int 1..65535> or --format <toon|text|json>
    And a flag shows no value, an array is marked with ..., and an optional or defaulted one is bracketed
    And each argument shows its name and constraint, such as <root: string>
    And an untyped argument shows <name> and an untyped option shows [--flag]

  Scenario: a usage error from a t declaration is printed in the caller's terms
    Given a command declaring t options and arguments
    When the invocation is missing a required option, gives one no value, or gives a value that fails
    Then the message names the option or argument, the element index of an array, and what was expected
    And it shows the received value only when one was given

  # ── Help for a Standard Schema config ──

  Scenario: help shows a Standard Schema config from its JSON Schema
    Given a command whose config schema exposes a JSON Schema through ~standard.jsonSchema
    When its help is rendered
    Then the Config section shows the shape a config file is written in, such as { name: string, port?: number }

  Scenario: help omits the Config section when the config exposes no JSON Schema
    Given a command whose config schema does not implement ~standard.jsonSchema, such as a zod 3 schema, or whose conversion throws
    When its help is rendered
    Then there is no Config section

  # ── UC8 — the built-in ui over cli({ streams }) and cli({ output }) ──

  Scenario: the ui writes to the streams the cli was given
    Given a cli built with its own stdout and stderr streams
    When a command says something at each level
    Then every message is written to those streams, one line each, and nothing to the process streams

  Scenario: console output writes info and debug to stdout and warn and error to stderr
    Given a cli whose output is console
    When a command says something at each level
    Then info and debug are written to stdout, and warn and error to stderr

  Scenario: axi output, the default, writes every ui message to stderr
    Given a cli whose output is axi, or that sets no output
    When a command says something at each level
    Then every message is written to stderr and nothing to stdout

  Scenario: the built-in ui follows the display level
    Given a cli using the built-in ui
    When it is invoked with --silent, with nothing, or with --verbose
    Then it says nothing, says info and above, or also says debug

  Scenario: help and version are answers, written to the given stdout in either output
    Given a cli built with its own streams, in either output
    When it is invoked asking for help or the version
    Then the help or the version is written to the given stdout and nothing to stderr

  Scenario: a line is its arguments joined by spaces, with objects inspected
    Given the built-in ui
    When a message is said with several arguments, some of them objects
    Then the line is the arguments joined by spaces, objects inspected, and no placeholder is read

  Scenario: error is red and warn is yellow on a stream that allows colour
    Given a stream that is a TTY with colour allowed
    When an error and a warning are said
    Then the error is red and the warning is yellow

  Scenario: a stream that is not a TTY is never coloured
    Given a stream that is not a TTY
    When a message is said, even with FORCE_COLOR set
    Then the line carries no colour

  Scenario: NO_COLOR turns colour off on a TTY
    Given a TTY stream and a non-empty NO_COLOR
    When a message is said
    Then the line carries no colour

  Scenario: FORCE_COLOR decides colour on a TTY
    Given a TTY stream and FORCE_COLOR set
    When a message is said
    Then it is coloured, unless FORCE_COLOR is 0 or false

  Scenario: without streams the built-in ui writes to the process streams by the output mode
    Given a cli built with no streams, in the default output or with output console
    When it says something at each level
    Then in the default output every message is on the process stderr, with no clibuilder prefix
    And with output console info and debug are on the process stdout and warn and error on its stderr
    And a stream that is not a TTY carries no colour

  # ── UC9 — EPIPE on the process stdout ──

  Scenario: a reader closing stdout early ends the cli quietly with exit 0
    Given a cli writing to the process stdout, piped to a reader
    When the reader closes before the cli has finished writing
    Then later writes are dropped, nothing is printed to stderr, and the process exits 0

  Scenario: a stream error other than EPIPE is not swallowed
    Given the process stdout
    When it reports an error other than EPIPE
    Then the error is rethrown

  Scenario: the EPIPE handler is installed once on the process stdout
    Given several clis built in one process
    When each one sets up its streams
    Then the process stdout carries one EPIPE handler

  Scenario: streams the cli was given are not watched for EPIPE
    Given a cli built with its own stdout stream
    When it sets up its streams
    Then no error handler is added to that stream

  # ── UC10 — encode an answer in the cli's format ──

  Scenario: an answer is encoded in toon by the official encoder
    Given a plain object
    When it is encoded in toon
    Then the text is what @toon-format/toon encodes, with no trailing newline

  Scenario: an answer is encoded in json on one line
    Given a plain object
    When it is encoded in json
    Then the text is its JSON.stringify

  Scenario: an answer is encoded in text as key and value lines
    Given a plain object with scalars, lists of scalars and lists of records
    When it is encoded in text
    Then each key is a line, a list of scalars is bulleted, a list of records is a table, and an empty list is (none)

  Scenario: an error report is error, code, the details fields, then help
    Given an error's message, code, details and help
    When it is laid out for encoding
    Then the keys are error, code, each details key, then help, and help is left out when empty

  # ── UC3 — showHelp: examples ──

  Scenario: declared examples are shown last, each description above its command line
    Given a command declaring examples
    When its help is rendered
    Then an Examples section closes the help, each description indented two spaces and its command line verbatim under it, indented four

  Scenario: a command with no examples shows no examples section
    Given a command declaring no examples
    When its help is rendered
    Then the help has no Examples section and is otherwise unchanged

  # ── UC11 — the structured help ──

  Scenario: the structured help carries what the text help shows
    Given a command declaring a description, aliases, arguments, options, a config and examples
    When its structured help is built
    Then it carries the name chain, the usage line, the description, the aliases, each argument and option, the config type and the examples
    And a key with nothing to say is left out

  Scenario: an option in the structured help carries its aliases, type, default, whether it is required, description and conflicts
    Given an option declaring aliases, a type, a default and a conflict
    When the structured help is built
    Then the option carries its name, its aliases, its type, its default, required true or false, its description and the options it conflicts with

  Scenario: the constraints of a t declaration are carried as min, max, pattern and values
    Given options declared with t.int({ min, max }), t.string({ pattern }), t.enum(values) and t.literal(value)
    When the structured help is built
    Then each carries its kind as type, with min and max, the pattern as the help shows it, or the allowed values

  Scenario: an array is described by its element and marked array
    Given an option declared with t.array of an element
    When the structured help is built
    Then it carries the element's type and constraints, with array true

  Scenario: a hidden alias is left out of the structured help
    Given an option declaring an alias marked hidden
    When the structured help is built
    Then that alias is not among the option's aliases

  Scenario: sub-commands are listed by name and the first line of their description
    Given a group declaring sub-commands, some with aliases and descriptions of several lines
    When its structured help is built
    Then each sub-command carries its name, its aliases and the first line of its description, and nothing else

  Scenario: the global options are listed once, apart from the root's own options
    Given a cli whose root declares the global options
    When the structured help of the root or of a command is built
    Then the global options are listed once under globalOptions, and the root's options leave them out

  Scenario: the structured help agrees with the text help on names, options and sub-commands
    Given a command, a group and the root
    When the text help and the structured help are both rendered
    Then the text help shows the usage line, each option, argument, sub-command and example the structured help carries
