import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { SecretKey, SecretStore } from '@main/domain/repositories'
import { AppError } from '@main/domain/errors/AppError'

export interface SafeStorageLike {
  isEncryptionAvailable(): boolean
  encryptString(plain: string): Buffer
  decryptString(encrypted: Buffer): string
}

/**
 * Cofre único cifrado com safeStorage (Keychain no macOS, libsecret no Linux, DPAPI no Windows).
 * Se a criptografia não estiver disponível, falha — nunca grava em texto puro.
 */
export class SafeStorageSecretStore implements SecretStore {
  private cache: Record<string, string> | null = null

  constructor(
    private readonly file: string,
    private readonly safeStorage: SafeStorageLike
  ) {}

  private ensureAvailable(): void {
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new AppError('INTERNAL', 'Criptografia do sistema indisponível: o Berrante não guarda segredos em texto puro')
    }
  }

  private async load(): Promise<Record<string, string>> {
    if (this.cache) return this.cache
    this.ensureAvailable()
    try {
      const raw = await readFile(this.file)
      this.cache = JSON.parse(this.safeStorage.decryptString(raw)) as Record<string, string>
    } catch {
      this.cache = {}
    }
    return this.cache
  }

  private async persist(data: Record<string, string>): Promise<void> {
    this.ensureAvailable()
    await mkdir(dirname(this.file), { recursive: true })
    const tmp = `${this.file}.tmp`
    await writeFile(tmp, this.safeStorage.encryptString(JSON.stringify(data)), { mode: 0o600 })
    await rename(tmp, this.file)
    this.cache = data
  }

  async get(key: SecretKey): Promise<string | null> {
    return (await this.load())[key] ?? null
  }

  async set(key: SecretKey, value: string): Promise<void> {
    await this.persist({ ...(await this.load()), [key]: value })
  }

  async delete(key: SecretKey): Promise<void> {
    const { [key]: _removed, ...rest } = await this.load()
    await this.persist(rest)
  }
}
