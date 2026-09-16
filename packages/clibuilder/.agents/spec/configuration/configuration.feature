Feature: Configuration

  Find the config a CLI should use, read it in whatever format it is written,
  and report where it came from. The search reads each ancestor directory once
  and matches it against every accepted name, so the nearest directory always
  wins and filename order only breaks ties within one directory. "Nothing
  found" is a distinct answer from "a config holding nothing".

  # ── UC1 — lookupConfig: find where the config would come from ──

  Scenario: a config file in an ancestor directory is the source
    Given a config file matching one of the accepted names in an ancestor directory
    When the config is looked up
    Then the source is that file, carrying the format its extension implies

  Scenario: the candidate list comes back alongside whichever source was found
    Given a lookup that settles on any source — a file, a package.json property, or none
    When the config is looked up
    Then the result carries the candidate names that were searched as well as the source

  Scenario: a package.json property is the source when no config file matches
    Given no config file matches, and the nearest package.json carries the config name as a property
    When the config is looked up
    Then the source is that package.json and the property read from it

  Scenario: nothing found is reported as a source of its own
    Given no config file matches and no package.json carries the property
    When the config is looked up
    Then the source says nothing was found, distinct from a config holding nothing

  # ── UC2 — resolveConfig / loadConfig: read the config ──

  Scenario: a file source is read and parsed into the config value
    Given the config resolves to a file
    When it is loaded
    Then the file is read and parsed, and its value is the config

  Scenario: a package.json source yields that property's value
    Given the config resolves to a package.json property
    When it is loaded
    Then the value of that property is the config

  Scenario: nothing found warns with the directory and every name searched
    Given the config resolves to nothing
    When it is loaded
    Then the warning names the directory searched and lists every candidate name, not an empty list

  Scenario: nothing found yields an undefined config
    Given the config resolves to nothing
    When it is loaded
    Then the config value is undefined

  # ── UC3 — getConfigFilenames: enumerate the accepted names ──

  Scenario: a config name already beginning with a dot is used as given
    Given a config name beginning with a dot
    When the candidate names are enumerated
    Then the names are the base names as given, without further dotted variants

  Scenario: a plain config name also accepts its dotted variants
    Given a config name with no leading dot
    When the candidate names are enumerated
    Then the names are the base name and its dotted variant, in that order, and nothing else

  # ── UC4 — readConfigFile: parse one file ──

  Scenario: a module config is imported through a file URL, so an absolute path resolves
    Given a module config at an absolute path
    When it is loaded
    Then it is imported as a file URL rather than as a bare specifier

  Scenario: a module config exporting activate yields the whole module
    Given a config file whose extension names a module
    When it exports activate
    Then the whole module is the config

  Scenario: a module config without activate yields its default export
    Given a config file whose extension names a module
    When it does not export activate
    Then its default export is the config

  Scenario: a JSON config accepts comments and trailing commas
    Given a config file whose extension names JSON
    When it contains comments and trailing commas
    Then it is parsed successfully

  Scenario: a YAML config is parsed as YAML
    Given a config file whose extension names YAML
    When it is read
    Then it is parsed as YAML

  Scenario: an extension-less config holding JSON is parsed as JSON
    Given a config file with no format-bearing extension
    When its content is JSON
    Then it is parsed as JSON

  Scenario: an extension-less config holding YAML falls through to YAML
    Given a config file with no format-bearing extension
    When its content is not JSON but is YAML
    Then the JSON attempt fails and it is parsed as YAML

  Scenario: a JSON config the parser could not read raises rather than returning a recovered value
    Given a config file parsed as JSON
    When the parser reports errors
    Then the failure is raised rather than returning the value the parser recovered

  # ── UC5 — findAnyFileUp / findFileUp: walk ancestors for a file ──

  Scenario: a file in the starting directory is found
    Given a candidate present in the starting directory
    When the walk runs
    Then that file's path is returned

  Scenario: the walk continues upward until a directory matches
    Given no candidate until an ancestor directory
    When the walk runs
    Then the walk continues upward and returns the match it finds there

  Scenario: two candidates in one directory are settled by candidate order
    Given two candidate names both present in the same directory
    When the walk runs
    Then the one earlier in the candidate order is returned

  Scenario: a later candidate in a nearer directory beats an earlier one further up
    Given an earlier candidate in an ancestor and a later candidate in a nearer directory
    When the walk runs
    Then the one in the nearer directory is returned

  Scenario: an unreadable directory is skipped rather than ending the walk
    Given a directory on the walk that cannot be read
    When the walk reaches it
    Then it is skipped and the walk continues upward

  Scenario: an exactly-named file wins over a differently-cased one
    Given a case-insensitive filesystem holding both an exact and a differently-cased name
    When the walk runs
    Then the exactly-named file is returned

  Scenario: a differently-cased file matches on a case-insensitive filesystem
    Given a case-insensitive filesystem holding only a differently-cased name
    When the walk runs
    Then that file is returned

  Scenario: a differently-cased file does not match on a case-sensitive filesystem
    Given a case-sensitive filesystem holding only a differently-cased name
    When the walk runs
    Then it is not treated as a match

  Scenario: a symlink pointing at a file counts as a match
    Given a candidate name that is a symlink to a file
    When the walk runs
    Then it is returned as a match

  Scenario: a dangling symlink sharing a candidate's name is not a match
    Given a candidate name that is a symlink whose target is missing
    When the walk runs
    Then it is not returned as a match, unlike a symlink pointing at a file

  Scenario: a directory sharing a candidate's name is not a match
    Given a directory named as one of the candidates
    When the walk runs
    Then it is not returned, and the search continues

  Scenario: a walk reaching the filesystem root with no match returns nothing
    Given no candidate anywhere between the starting directory and the root
    When the walk runs
    Then it stops at the root and returns nothing

  # ── UC6 — describeConfigSource: render a source for a reader ──

  Scenario: a file source is described by its path
    Given a source that is a file
    When it is described
    Then the description is that path

  Scenario: a package.json source names the property as well as the path
    Given a source that is a package.json property
    When it is described
    Then the description carries both the path and the property read from it

  Scenario: an absent source is described in words rather than left blank
    Given a source saying nothing was found
    When it is described
    Then the description is a readable phrase rather than an empty string
