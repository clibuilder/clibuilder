import { Cli, PresenterFactory, PlainPresenter, Display, PresenterOption, LogPresenter, HelpPresenter, VersionPresenter } from '../index'

class ColorDisplay implements Display {
  debug(...args: any[]): void {
    console.log('%c', ...args)
  }
  info(...args: any[]): void {
    console.info('%c', ...args)
  }
  warn(...args: any[]): void {
    console.warn('%c', ...args)
  }
  error(...args: any[]): void {
    console.log('%c', ...args)
  }
}

class ColorPresenter extends PlainPresenter implements LogPresenter, HelpPresenter, VersionPresenter {
  display = new ColorDisplay()
}
class ColorFactory implements PresenterFactory {
  createCliPresenter(option: PresenterOption) {
    return new ColorPresenter(option)
  }
  createCommandPresenter(option: PresenterOption) {
    return new ColorPresenter(option)
  }
}

const cli = new Cli({
  name: 'dummy',
  version: '1.0.0',
  commands: []
}, { presenterFactory: new ColorFactory() })

cli.parse([]).then(process.exit, process.exit)
