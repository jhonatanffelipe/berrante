import { open, type FileHandle } from 'node:fs/promises'

/**
 * Segue um arquivo de log (os processos escrevem direto em arquivo para sobreviver ao fechamento do app).
 * Polling curto é mais previsível que fs.watch no macOS para arquivos sendo anexados.
 */
export class FileTail {
  private handle: FileHandle | null = null
  private position = 0
  private timer: NodeJS.Timeout | null = null
  private reading = false

  constructor(
    private readonly path: string,
    private readonly onData: (text: string) => void,
    private readonly intervalMs = 150
  ) {}

  async start(fromPosition = 0): Promise<void> {
    this.handle = await open(this.path, 'r')
    this.position = fromPosition
    this.timer = setInterval(() => void this.flush(), this.intervalMs)
  }

  async flush(): Promise<void> {
    if (!this.handle || this.reading) return
    this.reading = true
    try {
      const { size } = await this.handle.stat()
      if (size < this.position) this.position = 0
      while (size > this.position) {
        const length = Math.min(size - this.position, 256 * 1024)
        const buffer = Buffer.alloc(length)
        const { bytesRead } = await this.handle.read(buffer, 0, length, this.position)
        if (!bytesRead) break
        this.position += bytesRead
        this.onData(buffer.subarray(0, bytesRead).toString('utf8'))
      }
    } catch {
      /* arquivo removido: ignora */
    } finally {
      this.reading = false
    }
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    await this.flush()
    await this.handle?.close().catch(() => undefined)
    this.handle = null
  }
}
