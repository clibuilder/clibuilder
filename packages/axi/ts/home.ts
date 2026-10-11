import * as axi from 'clibuilder/axi'

/**
 * Shortens a path under the home directory to `~/...`.
 *
 * @deprecated import `collapseHome` from `clibuilder/axi` instead.
 */
export const collapseHome: typeof axi.collapseHome = axi.collapseHome

/**
 * The first lines of a CLI's home view: `bin` and `description`.
 *
 * @deprecated import `homeHeader` from `clibuilder/axi` instead.
 */
export const homeHeader: typeof axi.homeHeader = axi.homeHeader
