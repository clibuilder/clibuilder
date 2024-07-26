---
"clibuilder": major
---

Drop support of global config.
It is not really a use case to begin with,
and it is causing problems in CI as CI nowadays not setting `USERPROFILE` var as assumed.
