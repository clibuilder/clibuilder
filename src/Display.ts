export interface Display {
  debug(...args: any[]): void
  info(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
  prompt(...args: any[]): Promise<any[]>
}

export enum DisplayLevel {
  Silent = 0,
  Normal = 10,
  Verbose = 20
}

export class ConsoleDisplay implements Display {
  private _prompt: any;

  constructor(prompt: any) {
    this._prompt = prompt;
  }

  debug(...args: any[]): void {
    console.log.apply(console, args)
  }
  info(...args: any[]): void {
    console.info.apply(console, args)
  }
  warn(...args: any[]): void {
    console.warn.apply(console, args)
  }
  error(...args: any[]): void {
    console.error.apply(console, args)
  }
  prompt(...args: any[]): Promise<any[]> {
    // return inquirer.prompt(args[0])
    if (args.length === 0) {
      throw new Error();
    }
    return this._prompt(args[0]);
    //TODO: support nested prompt
  }
}
