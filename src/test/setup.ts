import { addAppender } from 'aurelia-logging'

import { MemoryAppender } from 'aurelia-logging-memory'

const memoryAppender = new MemoryAppender()

addAppender(memoryAppender)

export { memoryAppender }
