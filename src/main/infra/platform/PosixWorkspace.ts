import { mkdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import type { Workspace } from '@main/domain/ports'

/** macOS/Linux: o workspace é o próprio sistema de arquivos. */
export class PosixWorkspace implements Workspace {
  toHost(path: string): string {
    return path
  }

  fromHost(hostPath: string): string | null {
    return hostPath
  }

  async exists(path: string): Promise<boolean> {
    return stat(path).then(
      () => true,
      () => false
    )
  }

  async isDirectory(path: string): Promise<boolean> {
    return stat(path).then(
      (s) => s.isDirectory(),
      () => false
    )
  }

  async mkdirp(path: string): Promise<void> {
    await mkdir(path, { recursive: true })
  }

  async home(): Promise<string> {
    return homedir()
  }
}
