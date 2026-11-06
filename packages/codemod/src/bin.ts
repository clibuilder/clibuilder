#!/usr/bin/env node
import { codemodCli } from './cli.js'

await codemodCli().parse(process.argv)
