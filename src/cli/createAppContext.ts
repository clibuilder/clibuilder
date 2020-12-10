import { getAppPath } from './getAppPath'
import { loadAppInfo } from './loadAppInfo'
import { createUI } from './ui/createUI'

/**
 * Creates an app context that provides interactions to external system
 * This
 */
export function createAppContext() {
  return {
    getAppPath,
    loadAppInfo,
    ui: createUI(),
    process
  }
}

export type AppContext = ReturnType<typeof createAppContext>
