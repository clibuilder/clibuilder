Feature: The plugins() extension

  Add the plugins command group and load plugins from the sources the CLI
  author chooses: include, then the project's direct dependencies when asked,
  then the config. Each package loads once, at its first position, and config
  can exclude one with a ! prefix.

  # ── UC1 — plugins(): load plugins into a CLI ──

  Scenario: the plugins group looks for the CLI name by default
    Given plugins() with no keywords
    When plugins list runs
    Then it looks for the CLI's name

  Scenario: the plugins group looks for the keywords it is given
    Given plugins() with keywords
    When plugins list runs
    Then it looks for those keywords

  Scenario: no plugins group is added when told not to
    Given plugins() with command set to false
    When the extension runs
    Then no command is added

  Scenario: included plugins load without any config
    Given plugins() including two installed plugins
    When the extension runs
    Then their commands are added in the order included

  Scenario: the plugins named in config load
    Given a config whose plugins key names an installed plugin
    When the extension runs
    Then the plugins group and the plugin's command are added

  Scenario: the plugins key is ignored when config is turned off
    Given a config naming a plugin, and plugins() with config set to false
    When the extension runs
    Then no plugin is loaded

  Scenario: a plugins key that is not a list is ignored
    Given a config whose plugins key is a string
    When the extension runs
    Then no plugin is loaded

  Scenario: direct dependencies carrying a keyword load only when asked to
    Given a project depending on a package that carries the CLI's keyword
    When the extension runs without and then with dependencies set to true
    Then the package loads only with dependencies set to true

  Scenario: sources load in order, each package once
    Given a package named by include, dependencies and config, and one more in each of the latter two
    When the extension runs
    Then the commands come in the order include, dependencies, config, with no package twice

  Scenario: config can exclude a plugin from the other sources
    Given two included plugins and a config entry excluding one with a ! prefix
    When the extension runs
    Then only the other plugin loads

  Scenario: a CLI loads plugins through use()
    Given a CLI using plugins() to include registry-sharing plugins
    When the consuming plugin's command runs
    Then it reads what the providing plugin registered

  # ── UC2 — the dependencies source ──

  Scenario: listed dependencies carrying a keyword are found in package.json order
    Given a project listing plugins under dependencies and devDependencies, and an unrelated package
    When dependency plugins are found
    Then the plugins are returned, dependencies first, and the unrelated package is not

  Scenario: an unlisted package is never checked
    Given a package carrying the keyword installed but not listed by the project
    When dependency plugins are found
    Then nothing is found

  Scenario: the nearest package.json and ancestor node_modules are used
    Given a working directory below a package.json, whose dependency is installed in an ancestor
    When dependency plugins are found
    Then the dependency is found

  Scenario: a missing package or one without keywords is skipped
    Given a project listing a package that is not installed and one that declares no keywords
    When dependency plugins are found
    Then nothing is found

  Scenario: nothing is found without a package.json
    Given a working directory with no package.json above it
    When dependency plugins are found
    Then nothing is found

  # ── UC3 — coexisting with clibuilder 11 ──

  Scenario: the extension carries the marker clibuilder 11 looks for
    Given the extension plugins() returns
    Then it carries the clibuilder.plugins-extension marker

  Scenario: plugins list and search behave the same as the built-in group
    Given a CLI with keywords, and the same CLI using plugins() with those keywords
    When each runs plugins list or plugins search, in each format
    Then both return the same value, write the same output and set the same exit code

  Scenario: plugins list and search give way to the global format option of clibuilder
    Given a cli whose global format option is active, under output axi or a cli format
    When the extension adds plugins list and plugins search
    Then their own format option is dropped instead of conflicting with the global one
    And they report in this.format
    And in the default console output with no cli format they keep their own format option

  Scenario: under output axi of clibuilder plugins list and search return their report as the answer
    Given a cli with output axi
    When the extension's plugins list or plugins search runs, in each format
    Then nothing is written through ui, and stdout holds the report once, printed by clibuilder from the returned answer
    And nothing installed or found is an empty state naming the keywords, exit 0
    And an unrecognized fields value is an invalid-value error on stdout, exit 2
    And in the default console output the report and the return value are unchanged
