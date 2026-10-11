@frozen
Feature: Execution

  Turn declarations into a running program. Assembly derives state from the
  options and starts any config and plugin loading; invocation answers the
  global flags, matches a command, checks its inputs, and either runs it or
  refuses. Global flags are answered before usage errors, and failure is
  reported as an exit code rather than thrown, so a wrong invocation reaches
  the user as a message instead of a stack trace.

  # ── UC1 — cli: assemble an application ──

  Scenario: a string config option names the config file
    Given an application declaring config as a string
    When its state is derived
    Then the config name is that string

  Scenario: config given as true names the config after the cli
    Given an application declaring config as true
    When its state is derived
    Then the config name is the application's own name

  Scenario: an application declaring no config has no config name
    Given an application declaring no config
    When its state is derived
    Then it has no config name

  Scenario: an application with config and no keywords searches under its own name
    Given an application declaring config and no keywords
    When its state is derived
    Then its keywords are the application's own name

  Scenario: declared keywords are kept as given
    Given an application declaring keywords
    When its state is derived
    Then its keywords are the ones declared

  Scenario: an application that can accept plugins gets the built-in plugins command
    Given an application declaring config or keywords
    When it is assembled
    Then the built-in plugins command is among its commands
    And it can be given argv without registering a command first

  Scenario: an application that cannot accept plugins gets no plugins command
    Given an application declaring neither config nor keywords
    When it is assembled
    Then no plugins command is registered

  Scenario: parse waits for the config started during assembly
    Given an application declaring a config name
    When it is given argv
    Then the config loading started during assembly has completed before a command is matched

  Scenario: commands from configured plugins are registered before parse proceeds
    Given a loaded config naming plugins
    When the application is given argv
    Then the commands those plugins contribute are registered before a command is matched

  # ── UC2 — register commands ──

  Scenario: a registered command records its parent
    Given an application
    When a named command is registered
    Then that command's parent is the command it was registered under

  Scenario: a nameless command records no parent
    Given an application
    When a command with no name is registered
    Then that command records no parent

  Scenario: nested sub-commands are linked to their own parent, not the root
    Given a command declaring sub-commands of its own
    When it is registered
    Then each sub-command's parent is the command declaring it

  Scenario: the default command may be registered only once
    Given an application
    When its default command is registered
    Then the builder returned no longer offers to register a default

  Scenario: registering a command makes the application executable
    Given an application declaring neither config nor keywords
    When a command is registered
    Then the application can be given argv

  # ── UC3 — parse: run an invocation ──

  Scenario: silent turns logging off and is not reported as unknown
    Given an application
    When it is invoked with the silent flag
    Then logging is turned off
    And the flag is not reported as an unknown option

  Scenario: verbose raises the log level and is not reported as unknown
    Given an application
    When it is invoked with the verbose flag
    Then the log level is raised to debug
    And the flag is not reported as an unknown option

  Scenario: debug-cli turns on framework logging and is not reported as unknown
    Given an application
    When it is invoked with the debug-cli flag
    Then framework debug messages are displayed
    And the flag is not reported as an unknown option

  Scenario: show-config reports the resolved config and where it came from
    Given an application that takes configuration
    When it is invoked asking to show the config
    Then the resolved config and its source are reported
    And no command runs

  Scenario: show-config on an application without config is an unknown option
    Given an application that takes no configuration
    When it is invoked asking to show the config
    Then the option is reported as unknown, because it was never declared

  Scenario: version asked of the application shows its version
    Given an application
    When it is invoked asking for the version
    Then the application's version is shown
    And no command runs

  Scenario: version asked for alone is answered before config and plugins load
    Given an application whose config loader rejects or never resolves
    When it is invoked with only the version flag
    Then the version is written to stdout as plain text
    And the cli exits with the success code

  Scenario: version asked for alone does not wait for plugin activation
    Given an application whose configured plugin never finishes activating
    When it is invoked with only the version flag
    Then the version is written to stdout without waiting for the plugin

  Scenario: the short version flag alone is the version even when a command declares it
    Given an application whose default command declares its own -v
    When it is invoked with only -v
    Then the version is written to stdout
    And the command does not run

  Scenario: version asked of a matched command shows the application version
    Given an application declaring a command
    When that command is invoked asking for the version
    Then the application's version is shown
    And the command does not run

  Scenario: version asked of a matched command waits for config and plugins
    Given an application declaring a config name and a command
    When that command is invoked asking for the version
    Then the config is loaded before the version is shown
    And nothing is written to stdout ahead of the normal path

  Scenario: help asked for shows help and runs nothing
    Given an application
    When it is invoked asking for help
    Then help is shown
    And no command runs

  Scenario: help is answered even when the invocation is otherwise wrong
    Given an invocation that also carries a usage error
    When it asks for help
    Then help is shown rather than the usage error

  Scenario: a global option given to a sub-command is not reported as unknown
    Given a sub-command declaring no options of its own
    When it is invoked with a global option
    Then that option is not reported as unknown

  Scenario: a malformed value on a global option given to a sub-command is a usage error
    Given a sub-command declaring no options of its own
    When it is invoked with a global option carrying a value of the wrong type
    Then the invalid value is reported as it is for the root command
    And the sub-command does not run
    And the cli exits with the usage code

  Scenario: global flags apply before a sub-command's usage errors are reported
    Given a sub-command declaring no options of its own
    When it is invoked with the silent flag and an unknown option
    Then the silent level is in effect when the usage error is reported
    And the silent flag is not reported as unknown

  Scenario: a malformed global option and a sub-command's own error are each reported once
    Given a sub-command declaring no options of its own
    When it is invoked with a global option carrying a value of the wrong type and an unknown option
    Then the invalid value of the global option is reported once
    And the unknown option is reported once
    And no unknown-option error names the global option

  Scenario: a sub-command's own option named like a global one is not the global option
    Given a sub-command declaring its own string option named like a global flag
    When it is invoked with that option and a value the global flag would reject
    Then no usage error is reported for it

  Scenario: a global flag before the command name applies and the command runs
    Given an application with a command and a group holding a sub-command
    When the verbose, silent or debug flag comes before the command name, or between the group and its sub-command
    Then the display level is set by the flag
    And the named command runs

  Scenario: the global format before the command name sets the format the command runs in
    Given an application under output axi with a command and a group holding a sub-command
    When the format option and its value come before the command name, or between the group and its sub-command
    Then the named command runs
    And it reads that format as this.format

  Scenario: help asked before the command name shows that command's help
    Given an application with a command
    When the help flag comes before the command name
    Then the command's help is shown
    And no command runs

  Scenario: a command's own option before the command name stays a usage error
    Given an application with a command declaring its own option
    When that option comes before the command name
    Then it is reported as an unknown option of the application
    And no command runs
    And the cli exits with the usage code

  Scenario: a usage error is printed with help and exits with the usage code
    Given an invocation carrying an unknown option that is not global
    When it is run
    Then the error is printed
    And help is shown
    And the cli exits with the usage code

  Scenario: a config failing the command's schema is reported field by field
    Given a matched command declaring a config schema
    When the loaded config does not satisfy it
    Then each failing field is printed
    And help is shown
    And the cli exits with the error code

  Scenario: a command declaring no config schema does not validate the config
    Given a matched command declaring no config schema
    When it is invoked
    Then no config validation happens and the command runs

  Scenario: a group command invoked bare shows help and exits with the usage code
    Given a matched command declaring sub-commands and no run
    When it is invoked without a sub-command
    Then help is shown
    And the cli exits with the usage code

  Scenario: a matched command runs and its value is returned
    Given a matched runnable command and an invocation carrying no errors
    When it is invoked
    Then the command runs and its return value is the result

  Scenario: a command failing with CliError is reported and sets its exit code
    Given a matched command whose run throws a CliError
    When it is invoked
    Then the error's message and help lines are printed
    And the cli exits with the code the error carries

  Scenario: a command throwing anything else propagates to the caller
    Given a matched command whose run throws something that is not a CliError
    When it is invoked
    Then the failure propagates to the caller rather than being reported

  # ── UC4 — CliError and the exit codes ──

  Scenario: a CliError with no exit code uses the error code
    Given a CliError constructed with no exit code
    When it is inspected
    Then its exit code is the error code

  Scenario: a CliError carries the exit code it was given
    Given a CliError constructed with an exit code
    When it is inspected
    Then its exit code is the one given

  Scenario: a CliError with no help carries an empty list
    Given a CliError constructed with no help
    When it is inspected
    Then its help is an empty list

  Scenario: a single help line is carried as a list of one
    Given a CliError constructed with one help line
    When it is inspected
    Then its help is a list holding that one line

  Scenario: several help lines are carried in order
    Given a CliError constructed with several help lines
    When it is inspected
    Then its help holds them in the order given

  Scenario: an error from a second copy of clibuilder is still recognized
    Given a CliError thrown by a duplicated copy of the package
    When it is tested
    Then it is recognized as a CliError, because the test is on a brand rather than the class

  Scenario: an ordinary error is not mistaken for a CliError
    Given a plain error
    When it is tested
    Then it is not recognized as a CliError

  Scenario: success, error, and usage are three distinct exit codes
    Given the exit codes the framework uses
    When they are compared
    Then success, error, and usage are three distinct values a caller can tell apart

  Scenario: a CliError accepts any exit code from 1 to 255
    Given a CliError constructed with an exit code of 1 or of 255
    When it is inspected
    Then its exit code is the one given

  Scenario: a CliError rejects an exit code outside 1 to 255
    Given an exit code of 0, of 256, negative, or not an integer
    When a CliError is constructed with it
    Then the construction fails with a RangeError, because an error must not exit 0

  Scenario: a CliError with no code or details uses the code error and no details
    Given a CliError constructed with only a message
    When it is inspected
    Then its code is error and its details are an empty record

  Scenario: a CliError rejects a code that is not kebab-case
    Given a code such as NotFound or not_found
    When a CliError is constructed with it
    Then the construction fails with a RangeError

  Scenario: a CliError rejects a details key it is rendered under
    Given details with the key error, code or help
    When a CliError is constructed with them
    Then the construction fails with a RangeError

  Scenario: a CliError can be constructed from one report object
    Given a report with a message, a code, details, help, an exit code and a cause
    When a CliError is constructed from it
    Then the error carries each of them

  Scenario: a subclass of CliError is a CliError
    Given a class extending CliError that passes a code and details
    When it is constructed and tested
    Then it is recognized as a CliError and carries the code and details

  Scenario: CliError.reported carries an exit code and is marked as reported
    Given CliError.reported called with an exit code
    When it is inspected
    Then it is a CliError with that exit code, marked as already reported, and an exit code of 0 is rejected

  Scenario: in axi output a CliError is rendered once on stdout in the cli's format
    Given a cli with output axi and a format of toon, json or text, toon by default
    When its command throws a CliError with a code, details and help
    Then stdout holds error, code, the details fields and help, in that order, encoded in that format
    And help is left out when it is empty
    And nothing is written to stderr
    And the cli exits with the error's exit code

  Scenario: in axi output a debugging copy of a CliError is a debug line
    Given a cli with output axi, invoked with --verbose
    When its command throws a CliError
    Then stdout holds the rendered report once, and stderr holds a debug line describing the error

  Scenario: in console output a CliError is reported on stderr as before
    Given a cli with output console, with or without a format
    When its command throws a CliError with help
    Then the message and help lines are written to stderr, nothing to stdout, and the exit code is the error's

  Scenario: a CliError already reported renders nothing
    Given a cli in either output
    When its command throws CliError.reported with an exit code
    Then nothing is written to stdout or stderr, even with --verbose, and the cli exits with that code

  Scenario: a cli format other than toon, json or text is rejected
    Given a cli built with a format that is not toon, json or text
    When it is constructed
    Then the construction fails with a TypeError naming the valid formats

  Scenario: in the default console output the global format option is not declared
    Given a cli in console output built with no format
    When a sub-command is invoked with --format json
    Then --format is reported as an unknown option, as before
    And the help lists no --format
    And a command may declare its own option named format

  Scenario: under output axi or cli format the global format option is accepted by every command
    Given a cli with output axi, or one built with a format, or both
    When a sub-command declaring no options is invoked with --format toon, json or text
    Then no usage error is reported
    And the help lists --format once, with the global options, defaulting to the cli's format, with no -f alias

  Scenario: run reads the resolved format as this.format
    Given a cli whose global format option is active
    When a command is invoked with or without --format
    Then this.format is the value passed, else the cli's format, toon by default
    And with the global option not active this.format is the cli's format, toon

  Scenario: a bad format value is a usage error reported in the default format
    Given a cli whose global format option is active and a usage-error handler
    When a command is invoked with --format yaml
    Then the handler receives one invalid-value error naming the format option, the value yaml and the allowed formats
    And the handler's context carries the cli's default format, not yaml
    And the command does not run and the cli exits with the usage code
    And without a handler the error is printed once by the usual usage-error report

  Scenario: a command declaring its own format option fails the cli at startup
    Given a cli whose global format option is active
    When a command, a sub-command, the default command or a command added by an extension declares its own option named format
    Then the cli fails with an error saying to delete the local declaration and read this.format
    And the error points at axi-native RFC section 3.4

  Scenario: in axi output a CliError is rendered in the format of the invocation
    Given a cli with output axi
    When it is invoked with --format json and its command throws a CliError
    Then stdout holds the report once, encoded in json

  Scenario: in axi output a value returned from run is printed once in the resolved format
    Given a cli with output axi
    When its command returns an object, with --format toon, json or text, or none
    Then stdout holds the value once, encoded in that format, else in the cli's format, ending on one newline
    And nothing is written to stderr and the exit code is unset

  Scenario: in axi output undefined prints nothing
    Given a cli with output axi
    When its command returns undefined, or returns nothing
    Then nothing is written to stdout or stderr

  Scenario: in axi output a returned string is written verbatim
    Given a cli with output axi
    When its command returns a string, in any format
    Then stdout holds the string exactly, ending on one newline

  Scenario: in axi output an array or a scalar is encoded under the result key
    Given a cli with output axi
    When its command returns an array, an array of records, a number, a boolean or null
    Then stdout holds it encoded under the key result in the resolved format

  Scenario: result adds next steps and per-format renderers
    Given a cli with output axi
    When its command returns result(value, { help }) with one or more help lines
    Then the help lines are encoded as the last key, help, inside the result, and an empty list leaves the key out
    When the command passes a renderer for the resolved format
    Then the renderer's string is written verbatim, followed by the help encoded in the same format after a blank line
    And a format without a renderer uses the encoder

  Scenario: document writes its content verbatim
    Given a cli with output axi
    When its command returns document(content), in any format
    Then stdout holds the content exactly, ending on one newline

  Scenario: empty is a success with an explicit empty state
    Given a cli with output axi
    When its command returns empty(message), with or without help
    Then stdout holds the message under the key empty, then any help, encoded in the resolved format
    And the exit code is unset, so the cli exits 0

  Scenario: an answer already written is not printed again
    Given a cli with output axi
    When its command returns an answer marked as written, as @clibuilder/axi's output.result() returns
    Then nothing more is written to stdout

  Scenario: parse resolves to the returned value
    Given a cli in either output
    When its command returns a value, or result(value), document(content) or empty(message)
    Then parse resolves to the value, the content or the message

  Scenario: in console output a returned value is not printed
    Given a cli in the default console output, with or without a cli format
    When its command returns a value, or result(), document() or empty()
    Then nothing is written to stdout for it, as before

  # ── UC5 — context ──

  Scenario: the first config resolution starts the walk and keeps its promise
    Given no config resolution in progress
    When a caller asks for the config
    Then the walk is started, and the same resolution answers the next caller

  Scenario: the first plugin load starts the activation pass and keeps its promise
    Given plugins not yet being loaded
    When they are loaded
    Then the activation pass is started and its promise is kept for later callers

  Scenario: concurrent plugin loading shares one activation pass
    Given a plugin load already in progress
    When another caller asks for the plugin commands
    Then it receives the same load rather than activating the plugins twice

  Scenario: concurrent config resolution shares one filesystem walk
    Given a config resolution already in progress
    When another caller asks for the config
    Then it receives the same resolution rather than starting a second walk

  Scenario: exiting records the code rather than ending the process
    Given a cli that has decided to fail
    When it exits with a code
    Then the code is recorded for the process to end with, leaving buffered output intact

  # ── UC2 — the ui a command runs with ──

  Scenario: a command's messages are logged under its own name
    Given a registered command with a name
    When it runs and says something
    Then the message is logged under that command's name

  Scenario: the nameless base command logs under the application's name
    Given the nameless base command
    When it runs and says something
    Then the message is logged under the application's name

  Scenario: a command's ui starts at the application's display level
    Given an application whose display level has been set
    When a command runs
    Then its ui reports at that level

  Scenario: a command calls showHelp with no arguments and gets its own help
    Given a registered command
    When its run calls showHelp with no arguments
    Then the help rendered is that command's own

  # ── arms whose twins were already covered ──

  Scenario: an application with keywords and no config name loads no config
    Given an application declaring keywords and no config name
    When it is assembled
    Then no config loading is awaited before a command is matched

  Scenario: a config naming no plugins activates none
    Given a loaded config that names no plugins
    When the application is assembled
    Then no plugin activation is attempted and no plugin commands are registered

  Scenario: registering an ordinary command leaves default still available
    Given a builder that has registered an ordinary command
    When the returned builder is inspected
    Then it still offers to register a default, unlike after a default was registered

  Scenario: a config satisfying the command's schema lets the command run
    Given a command declaring a config schema and a config that satisfies it
    When the invocation is parsed
    Then the command runs, and no failing field is reported

  Scenario: a command with no sub-commands has nothing further linked
    Given a registered command declaring no sub-commands
    When it is registered
    Then nothing further is linked and the parent chain terminates at it

  # ── UC6 — onUsageError: take over how usage errors are reported ──

  Scenario: the matched command's own handler takes over its usage errors
    Given an application declaring a usage-error handler
    And a group command declaring a usage-error handler
    And a sub-command of that group declaring its own usage-error handler
    When the sub-command is invoked with an unknown option
    Then only the sub-command's handler is called

  Scenario: an enclosing command's handler takes over its sub-command's usage errors
    Given an application declaring a usage-error handler
    And a group command declaring a usage-error handler
    And a sub-command of that group declaring none
    When the sub-command is invoked with an unknown option
    Then only the group's handler is called
    And it receives the sub-command as the matched command

  Scenario: a handler on a plugin's group takes over its sub-command's usage errors
    Given an application declaring a usage-error handler
    And a plugin adding a group command that declares a usage-error handler
    And a sub-command of that group declaring none
    When the sub-command is invoked with an unknown option
    Then only the plugin group's handler is called

  Scenario: the cli's handler takes over when no command in the chain declares one
    Given an application declaring a usage-error handler
    And a group command and its sub-command declaring none
    When the sub-command is invoked with an unknown option
    Then the application's handler is called
    And it receives the sub-command as the matched command

  Scenario: a handler receives each error and the matched command, and the framework prints nothing
    Given a command declaring a required argument and a named option
    And an application declaring a usage-error handler that records what it receives and writes nothing
    When the command is invoked with an unknown option and without its argument
    Then the handler receives an unknown-option error naming that option and a missing-argument error naming that argument
    And the matched command it receives lists the declared named option
    And the output is empty

  Scenario: a handler receives the resolved format and the usage exit code
    Given an application declaring a usage-error handler and no format of its own
    When an invocation with an unknown option reaches it
    Then the handler's context carries the format toon
    And it carries the usage exit code

  Scenario: a handler receives the format the cli was built with
    Given an application declaring a usage-error handler and a format of json
    When an invocation with an unknown option reaches it
    Then the handler's context carries the format json

  Scenario: each usage error a handler receives carries its stable code
    Given an application declaring a usage-error handler
    When an invocation reaches it with usage errors of each type
    Then an invalid-key error carries the code unknown-option
    And every other error carries a code equal to its type
    And comparing or serializing an error gives what it gave before the code existed

  Scenario: a handler that returns nothing leaves the usage exit code
    Given a usage-error handler that returns no value
    When an invocation with an unknown option reaches it
    Then the cli exits with the usage code

  Scenario: a handler that returns an exit code sets it
    Given a usage-error handler that returns an exit code other than the usage code
    When an invocation with an unknown option reaches it
    Then the cli exits with the returned code

  Scenario: a handler that throws propagates to the caller
    Given a usage-error handler that throws an error
    When an invocation with an unknown option reaches it
    Then parse rejects with that error
    And no exit code is recorded

  Scenario: a handler that asks for help gets the matched command's help
    Given a sub-command whose usage-error handler calls showHelp on the ui it receives
    When the sub-command is invoked with an unknown option
    Then the output shows the sub-command's usage line

  Scenario: a handler that does not ask for help shows none
    Given a usage-error handler that writes one line through the ui it receives and returns
    When an invocation with an unknown option reaches it
    Then the output is that one line and carries no usage line

  # ── UC7 — .use(): extend the application ──

  Scenario: an application with an extension can parse
    Given an application with no command of its own and an extension that adds one
    When the extension's command is invoked
    Then it runs and its value is returned

  Scenario: extensions run in use order, each awaited before the next
    Given two extensions, the first finishing asynchronously
    When the application is invoked
    Then the first finishes before the second starts

  Scenario: an extension's commands come after the host's own
    Given a host command and an extension that adds a command
    When help is asked for
    Then the host's command is listed before the extension's

  Scenario: a bare version is answered without running the extensions
    Given an application with an extension
    When it is invoked with only --version
    Then the version is shown
    And the extension did not run

  Scenario: version after a command runs the extensions
    Given an application with an extension that adds a command
    When that command is invoked with --version
    Then the extension ran

  Scenario: help lists the commands extensions add
    Given an extension that adds a command
    When help is asked for
    Then the help lists that command

  Scenario: extensions run once however often parse is called
    Given an application with an extension
    When parse is called twice
    Then the extension ran once

  Scenario: an error thrown by an extension rejects parse
    Given an extension that throws
    When the application is invoked
    Then parse rejects with that error

  Scenario: an extension is told its host and working directory
    Given an extension that records its context
    When the application is invoked
    Then the context names the application and its version, and the working directory

  Scenario: an extension shares the registry with the commands
    Given an extension that registers a value
    When a command reads it through this.registry
    Then the command sees the value

  Scenario: an extension logs through the framework ui
    Given an extension that logs a debug message
    When the application is invoked with --debug-cli
    Then the message is shown

  Scenario: resolveConfig reports no source when the application sets no config
    Given an application without config
    When an extension resolves the config
    Then there is no config and the source is none

  Scenario: resolveConfig resolves the application config and its source
    Given an application with config and a config file
    When an extension resolves the config
    Then it receives the file's content and that the source is a file

  Scenario: the plugins extension replaces the config-driven plugin loading
    Given an application with config naming a plugin, and the @clibuilder/plugins extension
    When the plugin's command is invoked
    Then it is an unknown command and the CLI exits with the usage code

  Scenario: the plugins extension replaces the automatic plugins group
    Given an application with config and the @clibuilder/plugins extension
    When the built-in plugins group is invoked
    Then the CLI exits with the usage code

  Scenario: another extension leaves the config-driven plugin loading in place
    Given an application with config naming a plugin, and some other extension
    When help is asked for
    Then the help lists the plugins group and the plugin's command

  # ── Config from any Standard Schema ──

  Scenario: a command gets its config schema's output, not the loaded input
    Given a matched command declaring a config schema with defaults and transforms, from zod 3, zod 4, valibot or any Standard Schema
    When the loaded config satisfies it
    Then the command's this.config is the schema's output, with the defaults filled in and the transforms applied

  Scenario: a Standard Schema config whose validate is async is awaited
    Given a matched command whose config schema's validate returns a promise
    When it is invoked
    Then the command runs with the resolved output, or the resolved issues are reported

  Scenario: a Standard Schema config's issues are reported like a zod config's
    Given a matched command declaring a config schema that is not zod 3
    When the loaded config does not satisfy it
    Then each issue's message is printed under its dotted path, one line per key, as the zod path prints a field
    And an issue without a path is printed under (config)
    And help is shown
    And the cli exits with the error code
