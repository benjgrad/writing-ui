import * as fs from 'fs'
import * as path from 'path'

export interface ConsoleLogEntry {
  timestamp: string
  level: 'log' | 'info' | 'warn' | 'error' | 'debug'
  message: string
  source: string
  url?: string
  lineNumber?: number
}

export interface ConsoleLogReport {
  collectedAt: string
  totalLogs: number
  errorCount: number
  warnCount: number
  logs: ConsoleLogEntry[]
}

export class ConsoleCollector {
  private logs: ConsoleLogEntry[] = []
  private outputFile: string
  private realTimeOutput: boolean

  constructor(
    options: {
      outputFile?: string
      realTimeOutput?: boolean
    } = {}
  ) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    this.outputFile =
      options.outputFile ||
      path.join(process.cwd(), 'tests', 'logs', `console-${timestamp}.json`)
    this.realTimeOutput = options.realTimeOutput ?? true

    // Ensure logs directory exists
    const logsDir = path.dirname(this.outputFile)
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
  }

  addLog(entry: Omit<ConsoleLogEntry, 'timestamp'>): void {
    const fullEntry: ConsoleLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    }

    this.logs.push(fullEntry)

    if (this.realTimeOutput) {
      this.printToTerminal(fullEntry)
    }
  }

  private printToTerminal(entry: ConsoleLogEntry): void {
    const colors: Record<ConsoleLogEntry['level'], string> = {
      log: '\x1b[0m', // default
      info: '\x1b[36m', // cyan
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
      debug: '\x1b[90m', // gray
    }
    const reset = '\x1b[0m'
    const color = colors[entry.level] || colors.log

    const shortTimestamp = entry.timestamp.split('T')[1].slice(0, 12)
    const prefix = `[${shortTimestamp}] [${entry.level.toUpperCase().padEnd(5)}]`

    console.log(`${color}${prefix} ${entry.message}${reset}`)
    if (entry.source && entry.source !== 'console-api') {
      console.log(
        `${color}         └─ ${entry.source}${entry.lineNumber ? `:${entry.lineNumber}` : ''}${reset}`
      )
    }
  }

  save(): string {
    const report: ConsoleLogReport = {
      collectedAt: new Date().toISOString(),
      totalLogs: this.logs.length,
      errorCount: this.logs.filter((l) => l.level === 'error').length,
      warnCount: this.logs.filter((l) => l.level === 'warn').length,
      logs: this.logs,
    }

    fs.writeFileSync(this.outputFile, JSON.stringify(report, null, 2))

    return this.outputFile
  }

  getErrors(): ConsoleLogEntry[] {
    return this.logs.filter((l) => l.level === 'error')
  }

  getWarnings(): ConsoleLogEntry[] {
    return this.logs.filter((l) => l.level === 'warn')
  }

  hasErrors(): boolean {
    return this.getErrors().length > 0
  }

  getAllLogs(): ConsoleLogEntry[] {
    return [...this.logs]
  }

  clear(): void {
    this.logs = []
  }

  getOutputFile(): string {
    return this.outputFile
  }
}
