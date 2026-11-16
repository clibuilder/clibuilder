#!/usr/bin/env node
import { cli } from 'clibuilder'
import { list } from './list.js'

cli({ name: 'tasks', version: '0.1.0' }).command(list).parse(process.argv)
