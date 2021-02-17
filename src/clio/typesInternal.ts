export type AppState<C> = {
  name: string,
  version?: string,
  description?: string,
  configFilePath?: string,
  config?: C,
}
