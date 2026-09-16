Feature: Testing support

  Exercise a command the way a user would, without spawning a process. The real
  builder, the real matching, and the real command all run; only the working
  directory, the log destination, and the exit are substituted. A test gets the
  return value, the messages, and the exit code back as three ordinary values.

  # ── UC1 — testCommand: exercise one command end to end ──

  Scenario: a command's return value comes back from the test helper
    Given a command that returns a value
    When it is exercised through the test helper
    Then that value is among the results

  Scenario: everything a command said is captured in order
    Given a command that emits messages
    When it is exercised through the test helper
    Then every message it emitted is captured, in order

  Scenario: a command that did not fail records no exit code
    Given a command that completes without failing
    When it is exercised through the test helper
    Then the recorded exit code is undefined, matching a process that exits zero

  Scenario: a command that failed records the exit code it set
    Given a command that fails
    When it is exercised through the test helper
    Then the recorded exit code is the one the command set

  Scenario: a config passed to the helper reaches the command without a file existing
    Given a config passed to the test helper
    When a command declaring a config schema is exercised
    Then the command sees that config, with no config file anywhere on disk

  Scenario: a command tested without a config sees none
    Given no config passed to the test helper
    When a command is exercised
    Then the command sees no config

  Scenario: the argv string is parsed as though typed after the cli name
    Given an invocation written as a string
    When a command is exercised with it
    Then it is matched as though the user had typed it after the cli's name

  # ── UC2 — mockPluginContext: exercise a plugin's activation ──

  Scenario: commands a plugin adds are collected for the test to assert on
    Given a plugin that adds commands during activation
    When it is activated against a mock context
    Then those commands are collected for the test to assert on

  Scenario: a value a plugin registers is stored under the mock's source
    Given a plugin that registers a value during activation
    When it is activated against a mock context
    Then the contribution is stored under the mock's source name

  Scenario: the mock context takes no arguments in the simple case
    Given no parameters
    When a mock plugin context is built
    Then it has a usable source, host, and registry of its own

  Scenario: a given source is used in place of the default
    Given a source name and nothing else
    When a mock plugin context is built with it
    Then a value the plugin registers is stored under that source name

  Scenario: a given host is used in place of the default
    Given a host identity and nothing else
    When a mock plugin context is built with it
    Then the plugin sees that host identity

  Scenario: a shared registry lets two plugins be activated against one another
    Given a registry passed in
    When two plugins are activated against contexts sharing it
    Then the second sees what the first registered

  # Current behavior, and a known fidelity gap: the real activation context
  # inspects the registration result and warns.
  Scenario: a refused registration is dropped silently rather than warned about
    Given a key already owned in the shared registry
    When a plugin registers the same key through a mock context
    Then the registration is dropped and nothing is reported

  # ── UC3 — mockContext: substitute the outside world ──

  Scenario: a named fixture directory becomes the working directory
    Given a fixture directory named
    When a mock context is built
    Then its working directory is that fixture directory

  Scenario: a context without a fixture gets a temporary directory of its own
    Given no fixture directory named
    When a mock context is built
    Then its working directory is a fresh temporary directory, isolated from other tests

  Scenario: an exit is recorded rather than taken
    Given a cli that decides to fail
    When it exits through a mock context
    Then the code is recorded and the test run is not ended

  Scenario: an exit with a code names the code among the captured messages
    Given a cli that decides to fail with a code
    When it exits through a mock context
    Then the captured messages carry an exit naming that code

  Scenario: a given log level is the one the mock log keeps to
    Given a log level passed to the mock context
    When a message below that level is emitted
    Then it is not among the captured messages

  Scenario: a mock context without a log level defaults to info
    Given no log level passed to the mock context
    When a debug message and an info message are emitted
    Then the info message is captured and the debug message is not

  Scenario: each command gets a ui on its own named logger
    Given a mock context
    When a command ui is created for an id
    Then its messages are captured under that id

  # Current behavior, and a known fidelity gap: the real context caches the
  # resolution so concurrent callers share one filesystem walk.
  Scenario: the mock resolves the config afresh on every call
    Given a mock context
    When the config is resolved more than once
    Then each call resolves afresh rather than sharing one resolution

  # ── UC4 — argv / getFixturePath ──

  Scenario: an invocation string becomes an argv array shaped like a real one
    Given an invocation written as a string
    When it is converted
    Then the result is shaped like a real argv, with the leading entries a process would carry

  Scenario: an argument containing a space becomes two arguments
    Given an invocation whose argument contains a space
    When it is turned into an argv array
    Then that argument appears as two separate elements

  Scenario: repeated spaces do not become empty arguments
    Given an invocation string containing repeated spaces
    When it is converted
    Then the repeated spaces collapse rather than producing empty arguments

  Scenario: a fixture name resolves to an absolute path under the fixtures directory
    Given a fixture's name
    When its path is resolved
    Then the result is an absolute path beneath the fixtures directory
