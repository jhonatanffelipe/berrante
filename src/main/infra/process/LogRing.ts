/** Buffer circular de texto (por bytes aproximados) para o histórico de log de cada serviço. */
export class LogRing {
  private chunks: string[] = []
  private size = 0

  constructor(private readonly maxChars = 512 * 1024) {}

  push(data: string): void {
    if (!data) return
    this.chunks.push(data)
    this.size += data.length
    while (this.size > this.maxChars && this.chunks.length > 1) {
      this.size -= this.chunks.shift()!.length
    }
    if (this.size > this.maxChars && this.chunks.length === 1) {
      const only = this.chunks[0]!.slice(-this.maxChars)
      this.chunks = [only]
      this.size = only.length
    }
  }

  text(): string {
    return this.chunks.join('')
  }

  clear(): void {
    this.chunks = []
    this.size = 0
  }
}
