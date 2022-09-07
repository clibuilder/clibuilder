"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clibuilder_1 = require("clibuilder");
const app = (0, clibuilder_1.cli)({
    name: 'test-cli',
    version: '1.0.0',
    config: true
}).loadPlugins(['cjs-plugin']);
app.parse(process.argv);
