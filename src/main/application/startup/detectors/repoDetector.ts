import type { ComposeInfo, LocalRepository, RepoDetection } from '@shared/types'
import type { RepoFiles } from '@main/domain/ports'
import { detectPackageManager, installCommand } from './packageManager'
import { classifyScripts } from './scriptClassifier'
import { parseReadme } from './readmeParser'
import { COMPOSE_FILES, mergeComposeSources, parseComposeYaml } from './composeParser'
import { ENV_EXAMPLE_FILES, checkEnv } from './envCheck'

const README_FILES = ['README.md', 'readme.md', 'Readme.md', 'README.markdown', 'README']

export interface ComposeLoader {
  /** `docker compose config`; null se o docker não estiver disponível ou falhar. */
  (composeFile: string): Promise<ComposeInfo | null>
}

/**
 * Inspeção determinística de um repositório. Só lê arquivos (RepoFiles) e,
 * opcionalmente, pede ao docker a configuração resolvida do compose.
 */
export async function detectRepo(repo: Pick<LocalRepository, 'id' | 'name' | 'path'>, files: RepoFiles, loadCompose: ComposeLoader): Promise<RepoDetection> {
  const warnings: string[] = []
  const entries = await files.list()

  let packageJson: Record<string, unknown> | null = null
  const pkgText = await files.readText('package.json')
  if (pkgText !== null) {
    try {
      packageJson = JSON.parse(pkgText) as Record<string, unknown>
    } catch {
      warnings.push('package.json inválido (JSON malformado)')
    }
  }

  const packageManager = detectPackageManager(packageJson, entries)
  const scripts = classifyScripts(packageJson?.scripts as Record<string, unknown> | undefined)
  const nodeModulesInstalled = entries.includes('node_modules')
  if (packageJson && !nodeModulesInstalled && packageManager) {
    warnings.push(`Dependências não instaladas: rode \`${installCommand(packageManager.name)}\``)
  }

  const readmeName = README_FILES.find((f) => entries.includes(f))
  const readmeText = readmeName ? await files.readText(readmeName) : null
  const readme = readmeText ? parseReadme(readmeText) : []

  let compose: ComposeInfo | null = null
  const composeFile = COMPOSE_FILES.find((f) => entries.includes(f))
  if (composeFile) {
    const yamlText = await files.readText(composeFile)
    let fromYaml: ComposeInfo | null = null
    try {
      fromYaml = yamlText ? parseComposeYaml(yamlText, composeFile) : null
    } catch {
      warnings.push(`${composeFile} não pôde ser lido como YAML`)
    }
    const fromDocker = await loadCompose(composeFile)
    compose = fromDocker ? mergeComposeSources(fromDocker, fromYaml) : fromYaml
    if (!fromDocker && fromYaml) warnings.push('Docker indisponível: compose lido direto do YAML (variáveis não interpoladas)')
  }

  let env: RepoDetection['env'] = null
  const exampleName = ENV_EXAMPLE_FILES.find((f) => entries.includes(f))
  if (exampleName) {
    const exampleText = (await files.readText(exampleName)) ?? ''
    const envText = entries.includes('.env') ? await files.readText('.env') : null
    env = checkEnv(exampleName, exampleText, envText)
    if (!env.envExists) warnings.push(`.env não encontrado: copie de ${exampleName} (cp ${exampleName} .env)`)
    else if (env.missingKeys.length) warnings.push(`.env sem as chaves: ${env.missingKeys.join(', ')}`)
  }

  if (!packageJson && !compose) warnings.push('Nada para subir: sem package.json nem docker compose')

  return {
    repoId: repo.id,
    repoName: repo.name,
    repoPath: repo.path,
    packageJson: packageJson !== null,
    packageManager,
    nodeModulesInstalled,
    scripts,
    compose,
    readme,
    env,
    warnings
  }
}
