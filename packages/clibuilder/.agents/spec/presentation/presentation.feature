Feature: Presentation

  Everything the cli says. Messages are buffered until argv has settled how
  much to say, then replayed. Help is generated from the declaration rather
  than written by hand. Reported collections are rendered in the format the
  reader asked for, defaulting to the structured one because a cli's own
  metadata is read by an agent more often than by a person.

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
    Then the schema's shape appears as a readable type

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

  Scenario: a string or number type is hinted beside the name
    Given an option or argument declaring a string or number type
    When its signature is rendered
    Then the type is hinted beside the name

  Scenario: an array type is marked variadic
    Given an option or argument declaring an array type
    When its signature is rendered
    Then it carries a variadic marker

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

  Scenario: a hidden alias is not shown
    Given an option declaring an alias marked hidden
    When its signature is rendered
    Then that alias does not appear

  Scenario: an option's default is named in its description
    Given an option declaring a default
    When its help entry is rendered
    Then the description names the default

  Scenario: a string default is quoted in the description
    Given an option declaring a string type and a default
    When its help entry is rendered
    Then the default appears quoted

  # ── UC5 — showVersion ──

  Scenario: an application with a version prints it
    Given an application built with a version
    When its version is shown
    Then the version is printed

  Scenario: an application without a version says so rather than printing nothing
    Given an application built without a version
    When its version is shown
    Then it reports that there is no version

  # ── UC6 — the output helpers ──

  Scenario: a value that could read as two entries is quoted and escaped
    Given a value containing a comma, a quote, or a backslash
    When it is rendered
    Then it is quoted and escaped so it cannot read as two entries

  Scenario: a value surrounded by whitespace is quoted
    Given a value beginning or ending with whitespace
    When it is rendered
    Then it is quoted

  Scenario: an ordinary value is left unquoted
    Given a value with nothing ambiguous in it
    When it is rendered
    Then it appears unquoted

  Scenario: a rendered array carries its count, so nothing looks truncated
    Given a collection rendered as an array
    When it is written
    Then the count is part of the line

  Scenario: a rendered table names its columns and indents one row per entry
    Given a collection rendered as a table
    When it is written
    Then a header names the columns and carries the count, and each entry is one indented row

  Scenario: a help line is counted like any other rendered list
    Given a next-step suggestion
    When it is rendered
    Then it carries a count, so one suggestion is distinguishable from several

  Scenario: prose for an empty collection names the keywords searched
    Given prose output and a collection with nothing in it
    When it is reported
    Then the wording says none were found and names the keywords searched

  Scenario: prose for one item describes it in the singular
    Given prose output and a collection of exactly one
    When it is reported
    Then the wording is singular and the item is described

  Scenario: prose for several items lists them under a plural heading
    Given prose output and a collection of several
    When it is reported
    Then a plural heading is followed by the items, one per line

  Scenario: json output carries the payload alone
    Given json asked for
    When a collection is reported
    Then the output is the payload as JSON with no help line

  Scenario: every command reporting a collection offers the same three formats and defaults to toon
    Given any command that reports a collection
    When its format option is read
    Then it offers the same three formats, worded the same way, defaulting to the structured one

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
