import { execFile } from 'node:child_process'
import type { SettingsRepository } from '@main/domain/repositories'
import { AppError } from '@main/domain/errors/AppError'
import { decodeWslOutput, parseWslListVerbose, type WslDistro } from './wslCore'

/** Caminho padrão do wsl.exe (System32), sem depender do PATH do Windows. */
export function defaultWslExe(): string {
  return `${process.env.SystemRoot ?? process.env.windir ?? 'C:\\Windows'}\\System32\\wsl.exe`
}

/**
 * Qual distro usar: a escolhida nas configurações ou a padrão da WSL.
 * O nome resolvido fica em cache (os caminhos UNC precisam dele de forma síncrona) e é refeito quando a
 * configuração muda.
 */
export class WslTarget {
  private resolved: string | null = null
  private listCache: { at: number; distros: WslDistro[] } | null = null

  constructor(
    readonly exe: string,
    private readonly settings: SettingsRepository
  ) {}

  async list(force = false): Promise<WslDistro[]> {
    if (!force && this.listCache && Date.now() - this.listCache.at < 10_000) return this.listCache.distros
    const raw = await new Promise<Buffer>((resolve, reject) => {
      execFile(this.exe, ['-l', '-v'], { encoding: 'buffer', windowsHide: true, timeout: 15_000, env: { ...process.env, WSL_UTF8: '1' } }, (err, stdout) => {
        if (err && !stdout?.length) reject(new AppError('PROCESS', `WSL indisponível: ${err.message}`))
        else resolve(stdout)
      })
    })
    const distros = parseWslListVerbose(decodeWslOutput(raw))
    this.listCache = { at: Date.now(), distros }
    return distros
  }

  /** Nome da distro em uso; lança se a WSL não tiver nenhuma distro utilizável. */
  async distro(): Promise<string> {
    if (this.resolved) return this.resolved
    const chosen = (await this.settings.get()).wslDistro
    const distros = await this.list()
    const match = chosen ? distros.find((d) => d.name.toLowerCase() === chosen.toLowerCase()) : distros.find((d) => d.isDefault) ?? distros[0]
    if (!match) {
      throw new AppError(
        'VALIDATION',
        chosen ? `A distro "${chosen}" não existe na WSL` : 'Nenhuma distro WSL encontrada: instale uma com `wsl --install -d Ubuntu`'
      )
    }
    this.resolved = match.name
    return match.name
  }

  /** Versão síncrona para traduzir caminhos; exige `distro()` resolvido antes (feito no init da plataforma). */
  current(): string {
    if (!this.resolved) throw new AppError('PROCESS', 'A distro WSL ainda não foi carregada')
    return this.resolved
  }

  invalidate(): void {
    this.resolved = null
    this.listCache = null
  }
}
