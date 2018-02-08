const { addAppender, setLevel, logLevel } = require('@unional/logging')
const { ColorAppender } = require('aurelia-logging-color')

addAppender(new ColorAppender())
setLevel(logLevel.debug)
