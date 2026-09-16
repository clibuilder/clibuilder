Feature: Plugins

  Import the plugin packages a configuration names, hand each a narrow
  activation context, and collect what it contributes. A broken plugin is
  reported and skipped rather than taking the host down. Modules are imported
  concurrently but activated one at a time in the order named, so the resulting
  command list is the same on every run. The registry is the seam between
  plugins: value keys are single-owner, collection keys accept everyone.

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

  # ── UC3 — createRegistry ──

  Scenario: an accepted registration carries no owning source
    Given a registration that is accepted, on a key of either kind
    When the result is inspected
    Then it names no owning source

  Scenario: the first registration of a value key is accepted
    Given a value key nobody has registered
    When a source registers it
    Then the registration is accepted

  Scenario: a second registration of a value key is refused and names the owner
    Given a value key already registered by one source
    When another source registers it
    Then the registration is refused
    And it carries the source that owns the key

  Scenario: every registration of a collection key is kept, in order
    Given a collection key
    When several sources register against it
    Then every contribution is kept, in registration order

  Scenario: reading a registered value key returns its value
    Given a value key that was registered
    When it is read
    Then its value is returned

  Scenario: reading an unregistered value key returns nothing
    Given a value key that was never registered
    When it is read
    Then nothing is returned

  Scenario: reading a collection key returns each contribution with its source
    Given a collection key several sources registered against
    When it is read
    Then each contribution is returned along with the source that made it

  Scenario: reading an unregistered collection key returns an empty list rather than nothing
    Given a collection key that was never registered
    When it is read
    Then an empty list is returned, so a caller can iterate without checking first

  Scenario: a registered key is reported as present
    Given a key that was registered
    When its presence is tested
    Then it is reported as present

  Scenario: an unregistered key is reported as absent
    Given a key that was never registered
    When its presence is tested
    Then it is reported as absent

  Scenario: describing a value key names its single owner
    Given a value key that was registered
    When it is described
    Then the one source owning it is named

  Scenario: describing an unregistered collection key returns an empty list rather than nothing
    Given a collection key nothing has registered against
    When it is described
    Then an empty list is returned, so a caller can iterate without checking first

  Scenario: describing an unregistered value key returns an empty list rather than nothing
    Given a value key that was never registered
    When it is described
    Then an empty list is returned, so a caller can iterate without checking first

  Scenario: describing a collection key names every contributor in order
    Given a collection key several sources registered against
    When it is described
    Then every contributing source is named, in registration order

  # ── UC4 — defineKey / defineCollectionKey ──

  Scenario: a key defined as a value takes the single-owner policy
    Given a key defined as a value key
    When it is registered twice
    Then the second registration is refused

  Scenario: a key defined as a collection takes the many-contributor policy
    Given a key defined as a collection key
    When it is registered twice
    Then both registrations are kept

  Scenario: two keys sharing an identifier are the same key
    Given two keys built separately from the same identifier
    When one plugin registers against the first and another reads the second
    Then the reader sees what the first registered
