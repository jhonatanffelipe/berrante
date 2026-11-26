import { app } from 'electron'
import type { UseCases } from '../../container'
import type { Handlers } from '../registerIpc'

/**
 * Controllers finos: o payload já chega validado pelo zod (registerIpc);
 * aqui só se chama o use case correspondente.
 */
export function buildHandlers(uc: UseCases): Handlers {
  return {
    'app:info': async () => ({ version: app.getVersion(), platform: process.platform, arch: process.arch }),

    'auth:status': () => uc.authStatus.execute(),
    'auth:startDeviceFlow': () => uc.startDeviceFlow.execute(),
    'auth:pollDeviceFlow': () => uc.pollDeviceFlow.execute(),
    'auth:cancelDeviceFlow': () => uc.cancelDeviceFlow.execute(),
    'auth:openVerificationUri': () => uc.openVerificationUri.execute(),
    'auth:importGhCli': () => uc.importGhCli.execute(),
    'auth:logout': () => uc.logout.execute(),

    'github:listRepos': (q) => uc.listGithubRepos.execute(q),

    'repos:listLocal': () => uc.listLocalRepos.execute(),
    'repos:clone': (i) => uc.cloneRepo.execute(i),
    'repos:pull': (i) => uc.pullRepo.execute(i.repoId),
    'repos:importFolder': (i) => uc.importFolder.execute(i.path),
    'repos:remove': (i) => uc.removeLocalRepo.execute(i.repoId),
    'repos:reveal': (i) => uc.revealRepo.execute(i.repoId),

    'projects:list': () => uc.listProjects.execute(),
    'projects:get': (i) => uc.getProject.execute(i.id),
    'projects:create': (i) => uc.createProject.execute(i),
    'projects:update': (i) => uc.updateProject.execute(i.id, i.input),
    'projects:delete': (i) => uc.deleteProject.execute(i.id),

    'startup:detect': (i) => uc.detectPlan.execute(i.projectId),
    'startup:savePlan': (i) => uc.savePlan.execute(i.projectId, i.plan),
    'startup:analyzeWithAi': (i) => uc.analyzeWithAi.execute(i.projectId, i.totpCode),

    'runtime:get': (i) => uc.getRuntime.execute(i.projectId),
    'runtime:checkConflicts': (i) => uc.checkConflicts.execute(i.projectId),
    'runtime:startAll': (i) => uc.startProject.execute(i.projectId, i.ignoreConflicts),
    'runtime:stopAll': (i) => uc.stopAll.execute(i.projectId),
    'runtime:startService': (i) => uc.startService.execute(i.projectId, i.serviceId),
    'runtime:stopService': (i) => uc.stopService.execute(i.projectId, i.serviceId),
    'runtime:restartService': (i) => uc.restartService.execute(i.projectId, i.serviceId),
    'runtime:runAction': (i) => uc.runAction.execute(i.projectId, i.repoId, i.name),
    'runtime:getLogs': (i) => uc.logs.execute(i.serviceId),
    'runtime:clearLogs': (i) => uc.logs.clear(i.serviceId),

    'ports:list': () => uc.listPorts.execute(),
    'ports:kill': (i) => uc.killPid.execute(i.pid, i.totpCode),

    'settings:get': () => uc.getSettings.execute(),
    'settings:update': (i) => uc.updateSettings.execute(i),
    'settings:setAiEnabled': (i) => uc.setAiEnabled.execute(i.enabled, i.totpCode),
    'settings:pickCloneRoot': async () => {
      const folder = await uc.pickCloneRoot.execute()
      return folder ? uc.updateSettings.execute({ cloneRoot: folder }) : uc.getSettings.execute()
    },
    'settings:aiStatus': () => uc.aiStatus.execute(),

    'security:totpStatus': () => uc.totpStatus.execute(),
    'security:totpBeginSetup': () => uc.totpBegin.execute(),
    'security:totpConfirm': (i) => uc.totpConfirm.execute(i.code),
    'security:totpDisable': (i) => uc.totpDisable.execute(i.code),
    'security:regenerateRecovery': (i) => uc.regenerateRecovery.execute(i.code)
  }
}
