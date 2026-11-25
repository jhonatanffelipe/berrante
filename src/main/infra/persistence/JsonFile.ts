import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Arquivo JSON com escrita atômica (tmp + rename) e fila para não intercalar gravações. */
export class JsonFile<T> {
  private cache: T | null = null
  private queue: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly path: string,
    private readonly fallback: () => T,
    private readonly mode = 0o600
  ) {}

  async read(): Promise<T> {
    if (this.cache !== null) return this.cache
    try {
      this.cache = JSON.parse(await readFile(this.path, 'utf8')) as T
    } catch {
      this.cache = this.fallback()
    }
    return this.cache
  }

  async write(value: T): Promise<void> {
    this.cache = value
    const task = this.queue.then(async () => {
      await mkdir(dirname(this.path), { recursive: true })
      const tmp = `${this.path}.${process.pid}.tmp`
      await writeFile(tmp, JSON.stringify(value, null, 2), { mode: this.mode })
      await rename(tmp, this.path)
    })
    this.queue = task.catch(() => undefined)
    await task
  }

  async update(fn: (current: T) => T): Promise<T> {
    const next = fn(await this.read())
    await this.write(next)
    return next
  }
}
