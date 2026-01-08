import type { Page, ConsoleMessage } from 'puppeteer'
import { ConsoleCollector, type ConsoleLogEntry } from './console-collector'

export function attachConsoleCollector(
  page: Page,
  collector: ConsoleCollector
): void {
  // Listen for all console logs
  page.on('console', (msg: ConsoleMessage) => {
    const type = msg.type()
    const level = mapConsoleType(type)

    collector.addLog({
      level,
      message: msg.text(),
      source: msg.location().url || 'console-api',
      url: msg.location().url,
      lineNumber: msg.location().lineNumber,
    })
  })

  // Capture page errors (uncaught exceptions)
  page.on('pageerror', (error) => {
    const err = error as Error
    collector.addLog({
      level: 'error',
      message: `Page Error: ${err.message}\n${err.stack || ''}`,
      source: 'page-error',
    })
  })

  // Capture request failures
  page.on('requestfailed', (request) => {
    collector.addLog({
      level: 'error',
      message: `Request Failed: ${request.url()} - ${request.failure()?.errorText || 'Unknown error'}`,
      source: 'network',
    })
  })
}

function mapConsoleType(type: string): ConsoleLogEntry['level'] {
  switch (type) {
    case 'error':
      return 'error'
    case 'warning':
      return 'warn'
    case 'info':
      return 'info'
    case 'debug':
      return 'debug'
    default:
      return 'log'
  }
}
