import type { ComposeInfo } from '@shared/types'
import type { CommandRunner, RepoFiles, RepoInspectorGateway, Workspace } from '@main/domain/ports'
import { parseComposeJson } from '@main/application/startup/detectors/composeParser'
import { FsRepoFiles } from './FsRepoFiles'

export class DockerRepoInspector implements RepoInspectorGateway {
  constructor(
    private readonly runner: CommandRunner,
    private readonly workspace: Workspace
  ) {}

  /** Leitura direta pelo caminho do host (no Windows, `\\wsl.localhost\<distro>\…`). */
  files(repoPath: string): RepoFiles {
    return new FsRepoFiles(this.workspace.toHost(repoPath))
  }

  /** `docker compose config` só lê e interpola; `--profile *` inclui serviços de todos os profiles. */
  async composeConfig(repoPath: string, composeFile: string): Promise<ComposeInfo | null> {
    const { stdout, code } = await this.runner.run('docker', ['compose', '-f', composeFile, '--profile', '*', 'config', '--format', 'json'], {
      cwd: repoPath,
      timeoutMs: 20_000
    })
    if (code !== 0 || !stdout.trim()) return null
    try {
      return parseComposeJson(stdout, composeFile)
    } catch {
      return null
    }
  }
}
