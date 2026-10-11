import type { ConfigLoadResult } from '../config.js'
import { defineKey } from '../plugins/registry.js'

/**
 * The shared-state key the `clibuilder/config` extension stores the resolved config under.
 *
 * Core reads it for `ExtensionContext.resolveConfig()` and the unloaded-plugins warning,
 * so it lives apart from the loader: a cli without `.use(config())` never imports `config.ts`.
 */
export const configKey = defineKey<ConfigLoadResult>('clibuilder.config')
