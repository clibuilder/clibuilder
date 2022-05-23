import { MemoryLogReporter } from 'standard-log'

export function getLogMessage(reporter: MemoryLogReporter) {
  return reporter.logs.map(log => log.args.join(' ')).join('\n')
}
