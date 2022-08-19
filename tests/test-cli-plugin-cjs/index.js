"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function activate(cli) {
  cli.addCommand({
    name: 'echo',
    arguments: [{ name: 'arg1' }],
    run: function (args) {
      this.ui.info('echo')
      return args.arg1
    }
  })
}
exports.activate = activate;
