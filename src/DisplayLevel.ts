export enum DisplayLevel {
  Silent = 0,
  Normal = 10,
  Verbose = 20
}

export let displayLevel = DisplayLevel.Normal

export function setDisplayLevel(level: DisplayLevel) {
  displayLevel = level
}

export function getDisplayLevel() {
  return displayLevel
}
