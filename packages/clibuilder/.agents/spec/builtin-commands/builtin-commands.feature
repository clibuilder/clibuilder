Feature: Built-in commands

  The commands every clibuilder application gets without writing them: the
  nameless base command carrying the global options, and the plugins group for
  seeing what is installed and finding more. The option set adapts to the
  application — show-config is declared only where it could do something — and
  the plugin reports are written for a person and for a parser at once.

  # ── UC1 — getBaseCommand: the global options ──

  Scenario: every application declares help, version, and the logging options
    Given any application
    When its base command is built
    Then it declares help, version, verbose, silent, and debug-cli

  Scenario: the global options carry their conventional short aliases
    Given any application
    When its base command is built
    Then help, version, and verbose each carry their conventional short alias

  Scenario: an application taking config also declares show-config
    Given an application that takes configuration
    When its base command is built
    Then show-config is among its options

  Scenario: an application taking no config does not advertise show-config
    Given an application that takes no configuration
    When its base command is built
    Then show-config is not among its options

  Scenario: running the base command itself shows help
    Given an application invoked with no command
    When the base command runs
    Then help is shown

  # ── UC2 — plugins list: report the installed plugins ──

  Scenario: installed plugins are listed and point at search for more
    Given plugins installed under the application's keywords
    When plugins list is run in the default format
    Then the plugin names are reported as a list
    And a help line points at plugins search for more

  Scenario: no installed plugins names the keywords searched and points at search
    Given no plugins installed under the application's keywords
    When plugins list is run in the default format
    Then the report names the keywords that were searched
    And a help line points at plugins search

  Scenario: JSON output carries the payload and no help line
    Given plugins installed
    When plugins list is run asking for JSON
    Then the payload is printed alone, with no trailing help line

  Scenario: JSON output reports an empty result in the same shape as a full one
    Given no plugins installed
    When plugins list is run asking for JSON
    Then the payload carries an empty list under the same key a full result uses

  Scenario: text output reads as English about how many were found
    Given plugins installed
    When plugins list is run asking for text
    Then the report is prose whose wording depends on how many were found

  Scenario: the found names are the command's return value as well as its output
    Given plugins installed
    When plugins list is run
    Then the found names are returned to the caller, not only printed

  Scenario: plugins list declares no fields option
    Given the plugins list command as declared
    When its options are inspected
    Then it offers no fields option

  Scenario: plugins list can be invoked as ls
    Given an application with the plugins command
    When the list command is invoked by its alias
    Then it runs as plugins list

  # ── UC3 — plugins search: find plugins on npm ──

  Scenario: each keyword is searched separately so a package matching any of them is found
    Given an application declaring several keywords
    When plugins search is run
    Then each keyword is searched on its own and the results are combined

  Scenario: a package matched by several keywords is listed once carrying each
    Given a package matching more than one of the application's keywords
    When plugins search is run
    Then it appears once, carrying each keyword that matched it

  Scenario: an unrecognized fields value is reported with guidance and nothing is searched
    Given plugins search invoked with a fields value that is not recognized
    When it runs
    Then the unrecognized value is reported with guidance on what is available
    And no search is performed

  Scenario: asking for the name field is accepted as a no-op
    Given plugins search invoked asking for the name field
    When it runs
    Then the request is accepted, because the name is always present

  Scenario: found packages are listed and point at plugins list
    Given packages found and no extra fields requested
    When plugins search is run in the default format
    Then the package names are reported as a list
    And a help line points at plugins list

  Scenario: asking for keywords reports a table of name and keywords
    Given packages found and the keywords field requested
    When plugins search is run in the default format
    Then the packages are reported as a table of name and keywords
    And a help line points at plugins list

  Scenario: no packages found names the keywords searched rather than printing an empty list
    Given no packages found
    When plugins search is run in the default format
    Then the report names the keywords that were searched
    And no help line is printed

  Scenario: JSON output without extra fields carries the names alone
    Given packages found and no extra fields requested
    When plugins search is run asking for JSON
    Then the payload carries the package names alone

  Scenario: JSON output with keywords carries the full records
    Given packages found and the keywords field requested
    When plugins search is run asking for JSON
    Then the payload carries each package with the keywords that matched it

  Scenario: text output describes the packages found in prose
    Given packages found
    When plugins search is run asking for text
    Then the report is prose describing what was found

  # ── UC4 — plugins: group the plugin commands ──

  Scenario: the plugins group declares no run of its own
    Given the plugins command
    When its declaration is read
    Then it declares sub-commands and no run

  Scenario: the plugins group carries list and search
    Given an application with the plugins command
    When its sub-commands are read
    Then they are list and search
