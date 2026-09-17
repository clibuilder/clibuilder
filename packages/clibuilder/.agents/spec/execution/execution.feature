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

  Scenario: version asked of a matched command shows the application version
    Given an application declaring a command
    When that command is invoked asking for the version
    Then the application's version is shown
    And the command does not run

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

  Scenario: a group command with nothing to run shows help
    Given a matched command declaring sub-commands and no run
    When it is invoked
    Then help is shown

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

