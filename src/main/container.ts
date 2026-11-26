import { app, safeStorage, type BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type { Project } from '@shared/types'
import { ShellEnv } from './infra/platform/ShellEnv'
import { composeStopCommand } from '@shared/workflow'
import { NodeCommandRunner } from './infra/platform/NodeCommandRunner'
import { RedactingLogger } from './infra/logging/RedactingLogger'
import {
  JsonLocalRepositoryRepository,
  JsonProjectRepository,
  JsonRuntimeStateRepository,
  JsonSettingsRepository
} from './infra/persistence/JsonRepositories'
import { SafeStorageSecretStore } from './infra/security/SafeStorageSecretStore'
import { NodeHasher, OtplibTotp } from './infra/security/OtplibTotp'
import { GithubHttpClient } from './infra/github/GithubHttpClient'
import { GhCliAdapter } from './infra/github/GhCliAdapter'
import { GitCli } from './infra/github/GitCli'
import { FsCloneScanner } from './infra/github/FsCloneScanner'
import { ProcessManager } from './infra/process/ProcessManager'
import { PosixProcessKiller } from './infra/process/PosixProcessKiller'
import { DockerCliAdapter } from './infra/docker/DockerCliAdapter'
import { LsofPortScanner } from './infra/ports/LsofPortScanner'
import { AiCliAdapter } from './infra/ai/AiCliAdapter'
import { DockerRepoInspector } from './infra/inspector/DockerRepoInspector'
import { ElectronShell } from './infra/electron/ElectronShell'
import { hostPorts } from './application/startup/detectors/composeParser'

import { TotpGuard } from './application/security/TotpGuard'
import { PendingTotpSetup } from './application/security/PendingTotpSetup'
import { GetTotpStatusUseCase } from './application/security/GetTotpStatusUseCase'
import { BeginTotpSetupUseCase } from './application/security/BeginTotpSetupUseCase'
import { ConfirmTotpSetupUseCase } from './application/security/ConfirmTotpSetupUseCase'
import { DisableTotpUseCase } from './application/security/DisableTotpUseCase'
import { RegenerateRecoveryCodesUseCase } from './application/security/RegenerateRecoveryCodesUseCase'
import { GetSettingsUseCase } from './application/settings/GetSettingsUseCase'
import { UpdateSettingsUseCase } from './application/settings/UpdateSettingsUseCase'
import { SetAiEnabledUseCase } from './application/settings/SetAiEnabledUseCase'
import { GetAiCliStatusUseCase } from './application/settings/GetAiCliStatusUseCase'
import { GithubSession } from './application/auth/GithubSession'
import { DeviceFlowState } from './application/auth/DeviceFlowState'
import { GetAuthStatusUseCase } from './application/auth/GetAuthStatusUseCase'
import { StartDeviceFlowUseCase } from './application/auth/StartDeviceFlowUseCase'
import { PollDeviceFlowUseCase } from './application/auth/PollDeviceFlowUseCase'
import { CancelDeviceFlowUseCase } from './application/auth/CancelDeviceFlowUseCase'
import { OpenVerificationUriUseCase } from './application/auth/OpenVerificationUriUseCase'
import { ImportGhCliSessionUseCase } from './application/auth/ImportGhCliSessionUseCase'
import { LogoutUseCase } from './application/auth/LogoutUseCase'
import { RepoCatalog } from './application/github/RepoCatalog'
import { ListGithubReposUseCase } from './application/github/ListGithubReposUseCase'
import { CloneRepoUseCase } from './application/github/CloneRepoUseCase'
import { PullRepoUseCase } from './application/github/PullRepoUseCase'
import { ImportLocalFolderUseCase } from './application/github/ImportLocalFolderUseCase'
import { ListLocalReposUseCase } from './application/github/ListLocalReposUseCase'
import { RemoveLocalRepoUseCase } from './application/github/RemoveLocalRepoUseCase'
import { RevealRepoUseCase } from './application/github/RevealRepoUseCase'
import { ListProjectsUseCase } from './application/projects/ListProjectsUseCase'
import { GetProjectUseCase } from './application/projects/GetProjectUseCase'
import { CreateProjectUseCase } from './application/projects/CreateProjectUseCase'
import { UpdateProjectUseCase } from './application/projects/UpdateProjectUseCase'
import { DeleteProjectUseCase } from './application/projects/DeleteProjectUseCase'
import { PickStepFolderUseCase } from './application/startup/PickStepFolderUseCase'
import { DetectStartupPlanUseCase } from './application/startup/DetectStartupPlanUseCase'
import { SaveStartupPlanUseCase } from './application/startup/SaveStartupPlanUseCase'
import { AnalyzeWithAiUseCase } from './application/startup/AnalyzeWithAiUseCase'
import { RuntimeService } from './application/runtime/RuntimeService'
import { GetRuntimeUseCase } from './application/runtime/GetRuntimeUseCase'
import { CheckPortConflictsUseCase } from './application/runtime/CheckPortConflictsUseCase'
import { StartProjectUseCase } from './application/runtime/StartProjectUseCase'
import { StopAllUseCase } from './application/runtime/StopAllUseCase'
import { StartServiceUseCase } from './application/runtime/StartServiceUseCase'
import { StopServiceUseCase } from './application/runtime/StopServiceUseCase'
import { RestartServiceUseCase } from './application/runtime/RestartServiceUseCase'
import { RunActionUseCase } from './application/runtime/RunActionUseCase'
import { GetLogsUseCase } from './application/runtime/GetLogsUseCase'
import { ListPortsUseCase } from './application/ports/ListPortsUseCase'
import { KillPidUseCase } from './application/ports/KillPidUseCase'
import { ListContainersUseCase } from './application/containers/ListContainersUseCase'
import { ContainerActionUseCase } from './application/containers/ContainerActionUseCase'
import { GetProjectContainersUseCase } from './application/containers/GetProjectContainersUseCase'
import { ProjectContainerActionUseCase } from './application/containers/ProjectContainerActionUseCase'

declare const __GITHUB_CLIENT_ID__: string

/** Composition root: DI manual, um lugar só para trocar adapters por plataforma. */
export function buildContainer(getWindow: () => BrowserWindow | null) {
  const dataDir = app.getPath('userData')
  const clientId = (process.env.BERRANTE_GITHUB_CLIENT_ID || __GITHUB_CLIENT_ID__ || '').trim()

  // ---- infra
  const logger = new RedactingLogger(join(dataDir, 'logs', 'berrante.log'), !app.isPackaged)
  const shellEnv = new ShellEnv()
  const runner = new NodeCommandRunner(shellEnv)
  const clock = { now: () => new Date() }
  const ids = { next: () => randomUUID() }
  const projects = new JsonProjectRepository(dataDir)
  const localRepos = new JsonLocalRepositoryRepository(dataDir)
  const settings = new JsonSettingsRepository(dataDir)
  const runtimeState = new JsonRuntimeStateRepository(dataDir)
  const secrets = new SafeStorageSecretStore(join(dataDir, 'secrets.bin'), safeStorage)
  const totp = new OtplibTotp()
  const hasher = new NodeHasher()
  const github = new GithubHttpClient()
  const gh = new GhCliAdapter(runner)
  const git = new GitCli(runner, join(dataDir, 'bin', 'askpass.sh'))
  const scanner = new FsCloneScanner()
  const pm = new ProcessManager(join(dataDir, 'logs', 'services'), shellEnv, logger)
  const killer = new PosixProcessKiller()
  const docker = new DockerCliAdapter(runner, shellEnv)
  const ports = new LsofPortScanner(runner)
  const ai = new AiCliAdapter(runner)
  const inspector = new DockerRepoInspector(runner)
  const shell = new ElectronShell(getWindow)

  // ---- serviços de aplicação
  const guard = new TotpGuard(secrets, totp, hasher, clock)
  const pendingTotp = new PendingTotpSetup()
  const session = new GithubSession(secrets, github)
  const deviceFlow = new DeviceFlowState()
  const catalog = new RepoCatalog(github)
  const detect = new DetectStartupPlanUseCase(projects, localRepos, inspector, clock, logger)
  const getProject = new GetProjectUseCase(projects)

  const portHints = async (project: Project): Promise<Map<string, number[]>> => {
    const hints = new Map<string, number[]>()
    const detections = await detect.detections(project.id).catch(() => [])
    for (const svc of project.plan?.services ?? []) {
      const list: number[] = []
      const det = detections.find((d) => d.repoId === svc.repoId)
      if (svc.kind === 'compose') {
        const info = det?.compose?.services.find((s) => s.name === svc.command)
        if (info) list.push(...hostPorts(info.ports))
      } else if (det?.compose && composeStopCommand(svc.command)) {
        // "docker compose up -d [svc...]": portas publicadas dos serviços que ele sobe.
        const named = svc.command.split(/\s+/).filter((t) => det.compose!.services.some((c) => c.name === t))
        for (const info of det.compose.services) {
          if (info.profiles.length || (named.length && !named.includes(info.name))) continue
          list.push(...hostPorts(info.ports))
        }
      }
      const envPort = Number(svc.env.PORT)
      if (Number.isInteger(envPort) && envPort > 0) list.push(envPort)
      hints.set(svc.id, list)
    }
    return hints
  }
  const runtime = new RuntimeService(projects, pm, docker, ports, settings, runtimeState, portHints, logger)
  const deviceFlowAvailable = clientId.length > 0

  return {
    logger,
    runtime,
    pm,
    useCases: {
      // auth
      authStatus: new GetAuthStatusUseCase(session, clientId, logger),
      startDeviceFlow: new StartDeviceFlowUseCase(github, deviceFlow, clientId),
      pollDeviceFlow: new PollDeviceFlowUseCase(github, deviceFlow, session, clientId, logger),
      cancelDeviceFlow: new CancelDeviceFlowUseCase(deviceFlow),
      openVerificationUri: new OpenVerificationUriUseCase(deviceFlow, shell),
      importGhCli: new ImportGhCliSessionUseCase(gh, session, deviceFlowAvailable, logger),
      logout: new LogoutUseCase(session, catalog, deviceFlowAvailable, logger),
      // repos
      listGithubRepos: new ListGithubReposUseCase(session, catalog, localRepos, scanner, settings),
      cloneRepo: new CloneRepoUseCase(session, catalog, git, localRepos, settings, ids, clock, logger),
      pullRepo: new PullRepoUseCase(localRepos, git, session, logger),
      importFolder: new ImportLocalFolderUseCase(localRepos, git, shell, settings, ids, clock),
      listLocalRepos: new ListLocalReposUseCase(localRepos),
      removeLocalRepo: new RemoveLocalRepoUseCase(localRepos, projects, clock),
      revealRepo: new RevealRepoUseCase(localRepos, shell),
      // projetos
      listProjects: new ListProjectsUseCase(projects),
      getProject,
      createProject: new CreateProjectUseCase(projects, localRepos, ids, clock),
      updateProject: new UpdateProjectUseCase(projects, localRepos, clock),
      deleteProject: new DeleteProjectUseCase(projects, runtime),
      // startup
      detectPlan: detect,
      savePlan: new SaveStartupPlanUseCase(projects, localRepos, clock),
      analyzeWithAi: new AnalyzeWithAiUseCase(projects, localRepos, settings, detect, ai, guard, logger),
      // runtime
      getRuntime: new GetRuntimeUseCase(getProject, runtime),
      checkConflicts: new CheckPortConflictsUseCase(getProject, runtime),
      startProject: new StartProjectUseCase(getProject, runtime),
      stopAll: new StopAllUseCase(getProject, runtime),
      startService: new StartServiceUseCase(getProject, runtime),
      stopService: new StopServiceUseCase(getProject, runtime),
      restartService: new RestartServiceUseCase(getProject, runtime),
      runAction: new RunActionUseCase(getProject, runtime),
      logs: new GetLogsUseCase(pm),
      // portas
      listPorts: new ListPortsUseCase(ports, runtime, projects),
      killPid: new KillPidUseCase(runtime, ports, killer, guard, projects, settings, logger),
      // containers (curral)
      listContainers: new ListContainersUseCase(docker, projects, localRepos),
      containerAction: new ContainerActionUseCase(docker, logger),
      projectContainers: new GetProjectContainersUseCase(getProject, docker),
      projectContainerAction: new ProjectContainerActionUseCase(getProject, docker, runtime, logger),
      // configurações e segurança
      getSettings: new GetSettingsUseCase(settings),
      updateSettings: new UpdateSettingsUseCase(settings),
      setAiEnabled: new SetAiEnabledUseCase(settings, guard, logger),
      aiStatus: new GetAiCliStatusUseCase(ai),
      pickCloneRoot: { execute: async () => shell.pickFolder('Pasta raiz dos clones', (await settings.get()).cloneRoot) },
      pickStepFolder: new PickStepFolderUseCase(projects, localRepos, shell),
      totpStatus: new GetTotpStatusUseCase(guard),
      totpBegin: new BeginTotpSetupUseCase(guard, totp, hasher, pendingTotp),
      totpConfirm: new ConfirmTotpSetupUseCase(pendingTotp, totp, secrets, logger),
      totpDisable: new DisableTotpUseCase(guard, secrets, settings, logger),
      regenerateRecovery: new RegenerateRecoveryCodesUseCase(guard, secrets, hasher)
    }
  }
}

export type Container = ReturnType<typeof buildContainer>
export type UseCases = Container['useCases']
