---
"args-minus": patch
---

In `strict` mode, an undeclared option whose name exists on `Object.prototype`, such as `--constructor` or `--toString`, is now reported as an unknown option.
Before, it was taken as declared.
