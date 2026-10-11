@frozen
Feature: Loading

  Import the plugin packages a configuration names, hand each a narrow
  activation context, and collect what it contributes. A broken plugin is
  reported and skipped rather than taking the host down. Modules are imported
  concurrently but activated one at a time in the order named, so the resulting
  command list is the same on every run.

  # ── UC1 — loadPlugins: activate the configured plugins ──

  Scenario: commands appear in the order the plugins were named
    Given several plugins each contributing a command
    When they are loaded
    Then the commands are returned in the order the plugins were named

  Scenario: a plugin that cannot be imported is reported and skipped
    Given a named plugin package that cannot be imported
    When the plugins are loaded
    Then a warning names the plugin, the working directory, and the underlying error
    And that plugin contributes nothing

  Scenario: a plugin that cannot be imported is also reported as not a valid plugin
    Given a named plugin package that cannot be imported
    When the plugins are loaded
    Then a second warning says it is not a valid plugin

  Scenario: a module that is not a plugin is reported and skipped
    Given a named package that imports but exports no activate function
    When the plugins are loaded
    Then a warning says it is not a valid plugin
    And that package contributes nothing

  Scenario: a broken plugin does not stop the others from activating
    Given one broken plugin named among working ones
    When the plugins are loaded
    Then the working plugins are still activated and their commands returned

  Scenario: an asynchronous activate is awaited before the next plugin
    Given a plugin whose activate is asynchronous
    When the plugins are loaded
    Then its activation completes before the next plugin is activated

  Scenario: a plugin is resolved from the working directory
    Given a plugin installed in the working directory
    When the plugins are loaded
    Then it is imported from there, not from where clibuilder sits

  Scenario: a plugin not installed in the working directory is imported by the name given
    Given a plugin name that does not resolve from the working directory
    When the plugins are loaded
    Then the name is imported as given

  Scenario: the commands a plugin adds are returned to the host
    Given a plugin that adds commands during activation
    When it is activated
    Then the commands returned to the host are exactly the ones it added, with nothing else and nothing repeated

  # ── UC2 — the activation context ──

  Scenario: a value a plugin registers is recorded under that plugin as its source
    Given a plugin registering a value under a key nobody owns
    When it is activated
    Then the contribution is stored with that plugin as its source

  Scenario: a plugin registering an already-owned key is told which plugin owns it
    Given a key already owned by an earlier plugin
    When a later plugin registers the same key
    Then a warning names the key and the plugin that owns it
    And the earlier plugin's value is left in place

  Scenario: a plugin can read what an earlier plugin registered
    Given a plugin activated after another that registered a key
    When it reads that key
    Then it sees the earlier plugin's contribution

  Scenario: a plugin is told the name and version of the host it is extending
    Given a plugin being activated
    When it reads its activation context
    Then it can see the host's name and version

  # ── UC3 — a plugin runs in a real process ──

  Scenario: a CommonJS plugin loads and runs in a real process
    Given a fixture cli whose config names a CommonJS plugin installed beside it
    When the plugin's command is run with node
    Then the command runs and the process exits with code 0

  Scenario: an ES module plugin loads and runs in a real process
    Given a fixture cli whose config names an ES module plugin installed beside it
    When the plugin's command is run with node
    Then the command runs and the process exits with code 0

  Scenario: the process exits after an asynchronous plugin command resolves
    Given a fixture cli whose config names a plugin with an asynchronous command
    When the command is run with node
    Then the command's output appears and the process exits on its own with code 0
