@frozen
Feature: Built-in commands

  The command every clibuilder application gets without writing it: the
  nameless base command carrying the global options. The option set adapts to
  the application — show-config is declared only where it could do something.

  # ── UC1 — getBaseCommand: the global options ──

  Scenario: every application declares help, version, and the logging options
    Given any application
    When its base command is built
    Then it declares help, version, verbose, silent, and debug-cli

  Scenario: silent and debug-cli carry no short alias
    Given any application
    When its base command is built
    Then silent and debug-cli each carry no short alias

  Scenario: the base command declares an empty commands list for extensions to be added to
    Given any application
    When its base command is built
    Then it declares a commands list, empty, rather than none at all

  Scenario: the global options carry their conventional short aliases
    Given any application
    When its base command is built
    Then help, version, and verbose each carry their conventional short alias

  Scenario: the base command declares the global format option only when it is active
    Given an application in console output with no format, and one with output axi or a format
    When its base command is built
    Then the first declares no format option
    And the second declares format, choices toon, json and text, defaulting to the cli's format, with no short alias

  Scenario: an application taking config also declares show-config
    Given an application that takes configuration
    When its base command is built
    Then show-config is among its options

  Scenario: an application taking no config does not advertise show-config
    Given an application that takes no configuration
    When its base command is built
    Then show-config is not among its options

  Scenario: the base command declares no run of its own
    Given an application's base command
    When its declaration is read
    Then it declares no run
