import { addAppender, getLogger, logLevel } from 'aurelia-logging'

import { MemoryAppender } from 'aurelia-logging-memory'

import { Display } from '../interfaces'

let appender: MemoryAppender
let nameMap = {}

function getUniqueName(name: string) {
  if (!nameMap[name])
    nameMap[name] = 1
  else
    nameMap[name] += 1

  return name + nameMap[name]
}

export function createInMemoryDisplay(name: string): InMemoryDisplay {
  if (!appender) {
    appender = new MemoryAppender()
    addAppender(appender)
  }

  name = getUniqueName(name)

  const display: any = getLogger(name)
  display.getErrorLogs = function () {
    return appender.logs.filter(l => l.id === name && l.level === logLevel.error).map(l => l.messages)
  }
  display.getWarnLogs = function () {
    return appender.logs.filter(l => l.id === name && l.level === logLevel.warn).map(l => l.messages)
  }
  display.getInfoLogs = function () {
    return appender.logs.filter(l => l.id === name && l.level === logLevel.info).map(l => l.messages)
  }
  display.getDebugLogs = function () {
    return appender.logs.filter(l => l.id === name && l.level === logLevel.debug).map(l => l.messages)
  }
  return display
}

export interface InMemoryDisplay extends Display {
  getErrorLogs(): string[][]
  getWarnLogs(): string[][]
  getInfoLogs(): string[][]
  getDebugLogs(): string[][]
}

export function generateDisplayedMessage(entries: string[][]) {
  return entries.map(e => e.join(' ')).join('\n')
}
