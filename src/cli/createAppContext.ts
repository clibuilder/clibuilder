import { createUI } from './ui/createUI'
import { AppInfo, loadAppInfo } from './loadAppInfo'

export function createAppContext({
  stack = new Error().stack
} = {}) {
  let appInfo: AppInfo
  return {
    loadAppInfo() {
      if (appInfo) return appInfo
      return appInfo = loadAppInfo(stack!)
    },
    createUI
  }
}

export type AppContext = ReturnType<typeof createAppContext>
