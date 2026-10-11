@frozen
Feature: Plugins commands

  The plugins list and plugins search commands, and the plugins group that
  holds them, for seeing which plugins are installed and finding more. Their
  reports are written for a person and for a parser at once: both structured
  formats report a list of one as a list, and the empty result names the
  keywords searched in the default format. They give way to the global format
  option of clibuilder when it is active.

  # ── UC1 — plugins list: report the installed plugins ──

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

  Scenario: the discovery call is declared as context so a test can substitute it
    Given the plugins list command as declared
    When its context is inspected
    Then the keyword discovery call is reachable there rather than imported directly

  # ── UC2 — plugins search: find plugins on npm ──

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

  Scenario: JSON output from search reports nothing found in the same shape as a full result
    Given JSON requested and no packages found
    When the search is reported
    Then the payload carries an empty list under the same key a full result uses, and no prose about the keywords

  Scenario: JSON output with keywords carries the full records
    Given packages found and the keywords field requested
    When plugins search is run asking for JSON
    Then the payload carries each package with the keywords that matched it

  Scenario: text output describes the packages found in prose
    Given packages found
    When plugins search is run asking for text
    Then the report is prose describing what was found

  Scenario: plugins search declares both a format and a fields option
    Given the plugins search command as declared
    When its options are inspected
    Then it offers a format option and a fields option

  Scenario: the npm search call is declared as context so a test can substitute it
    Given the plugins search command as declared
    When its context is inspected
    Then the npm search call is reachable there rather than imported directly

  # ── UC3 — plugins: group the plugin commands ──

  Scenario: the plugins group declares no run of its own
    Given the plugins command
    When its declaration is read
    Then it declares sub-commands and no run

  Scenario: the plugins group carries list and search
    Given an application with the plugins command
    When its sub-commands are read
    Then they are list and search

  # ── UC4 — the format the plugins commands report in ──

  Scenario: the plugins commands give way to the global format option
    Given an application whose global format option is active
    When plugins list or plugins search is run, with or without --format
    Then their own format option is dropped instead of conflicting, and their help does not list it
    And they report in this.format

  Scenario: under output axi the plugins commands return their report as the answer
    Given an application with output axi
    When plugins list or plugins search is run, in each format
    Then nothing is written through ui, and stdout holds the report once: the names with a help line, prose under text
    And nothing installed or found is an empty state naming the keywords, exit 0
    And an unrecognized fields value is an invalid-value error on stdout, exit 2
    And in the default console output the report and the return value are unchanged

  Scenario: the plugins commands keep their own format option otherwise
    Given an application in console output with no format
    When plugins list or plugins search is run with --format
    Then their own format option, defaulting to toon, chooses the report

  Scenario: every plugins command reporting a collection offers the same three formats and defaults to toon
    Given any command that reports a collection
    When its format option is read
    Then it offers the same three formats, worded the same way, defaulting to the structured one

  # ── UC5 — the output helpers: render a reported collection ──

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
