import { z } from 'zod'
import { BLOCK_SHAPES, DRACULA_ACCENTS } from '../types/palette'
import { ACCENT_NAMES } from '../theme'
import { TERMINAL_APPS } from '../types/settings'
import { isLocalHealthUrl } from '../workflow'

/**
 * Schemas de entrada de cada canal IPC. Ficam no shared para o tipo ser inferido no renderer,
 * mas só o main importa os valores (o renderer importa apenas `type`).
 */
const id = z.string().min(1).max(200)
const totpCode = z.string().regex(/^(\d{6}|[a-z0-9]{5}-[a-z0-9]{5})$/i, 'Código 2FA inválido')
const accent = z.enum(DRACULA_ACCENTS)
const absolutePath = z.string().min(1).max(4096).refine((p) => p.startsWith('/') || /^[a-zA-Z]:\\/.test(p), {
  message: 'Caminho precisa ser absoluto'
})

export const serviceDefinitionSchema = z.object({
  id,
  repoId: id,
  name: z.string().min(1).max(120),
  kind: z.enum(['setup', 'compose', 'script', 'command']),
  command: z.string().min(1).max(4000),
  composeFile: z.string().max(4096).nullable(),
  cwd: absolutePath,
  env: z.record(z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/), z.string().max(8000)),
  enabled: z.boolean(),
  order: z.number().int().min(0).max(10_000),
  waitFor: z.enum(['exit', 'port', 'start', 'health']).optional(),
  healthUrl: z.string().max(500).refine(isLocalHealthUrl, 'O healthcheck precisa ser uma URL http(s) de localhost').nullable().optional(),
  autoRestart: z.boolean().optional(),
  dependsOn: z.array(id).max(100),
  color: accent,
  origin: z.enum(['detected', 'readme', 'ai', 'user'])
})

export const startupPlanSchema = z.object({
  services: z.array(serviceDefinitionSchema).max(200),
  actions: z.array(z.object({ repoId: id, name: z.string().min(1).max(200), command: z.string().min(1).max(4000) })).max(500),
  profiles: z.array(z.object({ id: z.string().min(1).max(80), name: z.string().trim().min(1).max(40), serviceIds: z.array(id).max(200) })).max(20).optional(),
  detectedAt: z.string(),
  updatedAt: z.string()
})

const projectInput = z.object({
  name: z.string().trim().min(1).max(60),
  color: accent,
  icon: z.enum(BLOCK_SHAPES),
  repositoryIds: z.array(id).max(50),
  workspaceFile: absolutePath.refine((p) => p.endsWith('.code-workspace'), 'O workspace precisa ser um arquivo .code-workspace').nullable().optional()
})

const none = z.undefined().optional()
/** Nome de branch seguro para virar argv do git (sem opção disfarçada, sem `..`). */
const branchName = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._\/-]*$/, 'Nome de branch inválido')
  .refine((b) => !b.includes('..') && !b.endsWith('/') && !b.endsWith('.lock'), 'Nome de branch inválido')
const profileId = z.string().min(1).max(80).nullable().optional()

export const ipcSchemas = {
  'app:info': none,

  'auth:status': none,
  'auth:startDeviceFlow': none,
  'auth:pollDeviceFlow': none,
  'auth:cancelDeviceFlow': none,
  'auth:importGhCli': none,
  'auth:logout': none,
  'auth:openVerificationUri': none,

  'github:listRepos': z.object({
    search: z.string().max(200).optional(),
    owner: z.string().max(100).optional(),
    visibility: z.enum(['all', 'public', 'private']).optional(),
    cloned: z.enum(['all', 'cloned', 'not-cloned']).optional(),
    page: z.number().int().min(1).max(10_000).optional(),
    perPage: z.number().int().min(1).max(100).optional(),
    refresh: z.boolean().optional()
  }),

  'repos:listLocal': none,
  'repos:clone': z.object({
    fullName: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
    subdir: z
      .string()
      .max(200)
      .regex(/^[\w.\-/]*$/, 'Subpasta inválida')
      .refine((s) => !s.split('/').includes('..'), 'Subpasta inválida')
      .optional()
  }),
  'repos:pull': z.object({ repoId: id }),
  'repos:importFolder': z.object({ path: absolutePath.optional() }),
  'repos:remove': z.object({ repoId: id }),
  'repos:reveal': z.object({ repoId: id }),
  'repos:openTerminal': z.object({ repoId: id }),

  'projects:list': none,
  'projects:get': z.object({ id }),
  'projects:create': projectInput,
  'projects:update': z.object({ id, input: projectInput }),
  'projects:delete': z.object({ id }),
  'projects:pickWorkspace': z.object({ defaultPath: absolutePath.optional() }),
  'projects:openWorkspace': z.object({ id }),
  'projects:gitStatus': z.object({ projectId: id, fetch: z.boolean().optional() }),
  'projects:pullAll': z.object({ projectId: id }),
  'projects:branches': z.object({ projectId: id }),
  'projects:checkout': z.object({ projectId: id, branch: branchName }),
  'projects:fixEnv': z.object({ projectId: id, repoId: id }),

  'startup:detect': z.object({ projectId: id }),
  'startup:savePlan': z.object({ projectId: id, plan: startupPlanSchema }),
  'startup:analyzeWithAi': z.object({ projectId: id, totpCode: totpCode.optional() }),
  'startup:pickFolder': z.object({ projectId: id, defaultPath: absolutePath.optional() }),

  'runtime:get': z.object({ projectId: id }),
  'runtime:checkConflicts': z.object({ projectId: id, profileId }),
  'runtime:preflight': z.object({ projectId: id, profileId }),
  'runtime:startAll': z.object({ projectId: id, ignoreConflicts: z.boolean().optional(), profileId }),
  'runtime:stopAll': z.object({ projectId: id }),
  'runtime:startService': z.object({ projectId: id, serviceId: id }),
  'runtime:stopService': z.object({ projectId: id, serviceId: id }),
  'runtime:restartService': z.object({ projectId: id, serviceId: id }),
  'runtime:runAction': z.object({ projectId: id, repoId: id, name: z.string().min(1).max(200) }),
  'runtime:getLogs': z.object({ serviceId: id }),
  'runtime:clearLogs': z.object({ serviceId: id }),

  'ports:list': none,
  'ports:kill': z.object({ pid: z.number().int().min(2), totpCode: totpCode.optional() }),
  'ports:open': z.object({ port: z.number().int().min(1).max(65_535) }),

  'containers:list': none,
  'containers:action': z.object({ id: z.string().regex(/^[a-f0-9]{12,64}$/, 'ID de container inválido'), action: z.enum(['start', 'stop', 'restart']) }),
  'containers:project': z.object({ projectId: id }),
  'containers:projectAction': z.object({
    projectId: id,
    stackId: id,
    action: z.enum(['up', 'stop', 'restart']),
    service: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/, 'Serviço inválido').optional()
  }),

  'settings:get': none,
  'settings:update': z.object({
    cloneRoot: absolutePath.optional(),
    aiCli: z.enum(['claude', 'agy']).optional(),
    accent: z.enum(ACCENT_NAMES).optional(),
    tintBackground: z.boolean().optional(),
    showGrid: z.boolean().optional(),
    notifications: z.boolean().optional(),
    terminalApp: z.enum(TERMINAL_APPS).optional(),
    stopTimeoutMs: z.number().int().min(500).max(60_000).optional()
  }),
  'settings:setAiEnabled': z.object({ enabled: z.boolean(), totpCode: totpCode.optional() }),
  'settings:pickCloneRoot': none,
  'settings:aiStatus': none,

  'security:totpStatus': none,
  'security:totpBeginSetup': none,
  'security:totpConfirm': z.object({ code: z.string().regex(/^\d{6}$/) }),
  'security:totpDisable': z.object({ code: totpCode }),
  'security:regenerateRecovery': z.object({ code: totpCode })
} as const

export type IpcSchemas = typeof ipcSchemas
