# Glossary

- **Application:** the CLI a consumer builds with `clibuilder`, identified by the
  `name` and `version` it declares.
- **Command:** a named unit of behavior an application can run, declaring its own
  arguments, options, and optional configuration schema.
- **Default command:** the command that runs when no sub-command name matches.
- **Sub-command:** a command nested under another, reached by naming its parents
  in order.
- **Argument:** a positional input a command declares, consumed in declaration
  order.
- **Option:** a named input a command declares, supplied by its name or alias
  rather than its position.
- **Alias:** an alternate name for a command or an option.
- **Declaration:** what a command author states about a command — the single
  source the framework reads for routing, validation, and help.
- **Coercion:** turning a raw command-line string into the type an argument or
  option declared.
- **Configuration:** the file-supplied settings an application reads, validated
  against the schema the invoked command declared.
- **Plugin:** a separately published package that contributes commands to an
  application that names it.
- **Activation:** the call through which a plugin registers its contributions.
- **Registry:** the store a plugin's contributions are registered into.
- **Output format:** the serialization a command uses to report a collection,
  chosen by its reader rather than its author.
