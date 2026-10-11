@frozen
Feature: Registry

  The registry is the seam between plugins and other extensions. It carries
  typed keys of two kinds: value keys are single-owner and first-registration-
  wins, so a conflict is told to the second claimant; collection keys accept
  every contribution, so contributors add to a list without knowing about each
  other.

  # ── UC1 — createRegistry ──

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

  # ── UC2 — defineKey / defineCollectionKey ──

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
