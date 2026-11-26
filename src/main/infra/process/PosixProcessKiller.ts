import type { ProcessKiller } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function isAlive(target: number): boolean {
  try {
    process.kill(target, 0)
    return true
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/** SIGTERM → espera → SIGKILL. `target` negativo = process group. */
export async function terminate(target: number, timeoutMs: number): Promise<void> {
  try {
    process.kill(target, 'SIGTERM')
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'ESRCH') return
    if (code === 'EPERM') throw new AppError('PROCESS', 'Sem permissão para encerrar esse processo')
    throw err
  }
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!isAlive(target)) return
    await sleep(100)
  }
  try {
    process.kill(target, 'SIGKILL')
  } catch {
    /* já morreu */
  }
}

export class PosixProcessKiller implements ProcessKiller {
  async isAlive(pid: number): Promise<boolean> {
    return isAlive(pid)
  }
  kill(pid: number, timeoutMs: number): Promise<void> {
    if (pid <= 1 || pid === process.pid) throw new AppError('PROCESS', 'Esse processo não pode ser encerrado')
    return terminate(pid, timeoutMs)
  }
}
