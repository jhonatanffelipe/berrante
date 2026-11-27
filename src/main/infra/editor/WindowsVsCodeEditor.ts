import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { EditorGateway } from '@main/domain/ports'
import { AppError } from '@main/domain/errors/AppError'
import type { ShellEnv } from '../platform/ShellEnv'
import { envGet } from '../platform/platform'

/**
 * Abre o Code.exe direto (instalação do usuário, do sistema ou a do `code` no PATH). O `code.cmd` exigiria cmd.exe,
 * e o Code.exe aceita o caminho do workspace como argumento.
 */
export class WindowsVsCodeEditor implements EditorGateway {
  constructor(private readonly shellEnv: ShellEnv) {}

  async workspaceExists(path: string): Promise<boolean> {
    try {
      return (await stat(path)).isFile()
    } catch {
      return false
    }
  }

  private async codeExe(): Promise<string | null> {
    const env = await this.shellEnv.resolve()
    const candidates: string[] = []
    const local = envGet(env, 'LOCALAPPDATA')
    if (local) candidates.push(join(local, 'Programs', 'Microsoft VS Code', 'Code.exe'))
    for (const base of [envGet(env, 'ProgramW6432'), envGet(env, 'ProgramFiles'), envGet(env, 'ProgramFiles(x86)')]) {
      if (base) candidates.push(join(base, 'Microsoft VS Code', 'Code.exe'))
    }
    // <instalação>\bin\code.cmd → <instalação>\Code.exe
    for (const dir of (envGet(env, 'PATH') ?? '').split(';').filter(Boolean)) {
      if (existsSync(join(dir, 'code.cmd'))) candidates.push(join(dirname(dir), 'Code.exe'))
    }
    return candidates.find((c) => existsSync(c)) ?? null
  }

  async openWorkspace(path: string): Promise<void> {
    const exe = await this.codeExe()
    if (!exe) throw new AppError('NOT_FOUND', 'VS Code não encontrado: instale o Visual Studio Code')
    const env = await this.shellEnv.resolve()
    await new Promise<void>((resolve, reject) => {
      const child = spawn(exe, [path], { env, detached: true, stdio: 'ignore' })
      child.once('spawn', () => {
        child.unref()
        resolve()
      })
      child.once('error', (err) => reject(new AppError('NOT_FOUND', 'Não deu para abrir o VS Code', { output: err.message })))
    })
  }
}
