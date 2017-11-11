const { addAppender } = require('@unional/logging')
const { ColorAppender } = require('aurelia-logging-color')

addAppender(new ColorAppender())
