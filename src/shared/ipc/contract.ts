import type { MenuCommand } from '../menu'
import type { z } from 'zod'
import type { IpcSchemas } from './schemas'
import type {
  AiCliStatus,
  AiWorkflowSuggestion,
  AuthStatus,
  ContainerList,
  DetectionResult,
  DeviceFlowPoll,
  DeviceFlowStart,
  GitOperationResult,
  LocalRepository,
  PortBinding,
  PortConflict,
  Project,
  ProjectContainers,
  ProjectRuntime,
  RepoListResult,
  Settings,
  StartResult,
  StartupPlan,
  TotpSetup,
  TotpStatus,
  LogChunk,
  IpcEnvelope
} from '../types'

export interface AppInfo {
  version: string
  platform: string
  arch: string
}

/** Tipo de retorno de cada canal. O de entrada vem do schema zod. */
export interface IpcOutputs {
  'app:info': AppInfo

  'auth:status': AuthStatus
  'auth:startDeviceFlow': DeviceFlowStart
  'auth:pollDeviceFlow': DeviceFlowPoll
  'auth:cancelDeviceFlow': void
  'auth:importGhCli': AuthStatus
  'auth:logout': AuthStatus
  'auth:openVerificationUri': void

  'github:listRepos': RepoListResult

  'repos:listLocal': LocalRepository[]
  'repos:clone': GitOperationResult
  'repos:pull': GitOperationResult
  'repos:importFolder': LocalRepository | null
  'repos:remove': void
  'repos:reveal': void

  'projects:list': Project[]
  'projects:get': Project
  'projects:create': Project
  'projects:update': Project
  'projects:delete': void

  'startup:detect': DetectionResult
  'startup:savePlan': Project
  'startup:analyzeWithAi': AiWorkflowSuggestion
  'startup:pickFolder': string | null

  'runtime:get': ProjectRuntime
  'runtime:checkConflicts': PortConflict[]
  'runtime:startAll': StartResult
  'runtime:stopAll': void
  'runtime:startService': void
  'runtime:stopService': void
  'runtime:restartService': void
  'runtime:runAction': string
  'runtime:getLogs': string
  'runtime:clearLogs': void

  'ports:list': PortBinding[]
  'ports:kill': void

  'containers:list': ContainerList
  'containers:action': void
  'containers:project': ProjectContainers
  'containers:projectAction': void

  'settings:get': Settings
  'settings:update': Settings
  'settings:setAiEnabled': Settings
  'settings:pickCloneRoot': Settings
  'settings:aiStatus': AiCliStatus[]

  'security:totpStatus': TotpStatus
  'security:totpBeginSetup': TotpSetup
  'security:totpConfirm': TotpStatus
  'security:totpDisable': TotpStatus
  'security:regenerateRecovery': string[]
}

export type IpcChannel = keyof IpcSchemas & keyof IpcOutputs
export type IpcInput<C extends IpcChannel> = z.input<IpcSchemas[C]>
export type IpcOutput<C extends IpcChannel> = IpcOutputs[C]

/** Eventos main → renderer. */
export interface IpcEvents {
  'runtime:logs': LogChunk[]
  'runtime:status': ProjectRuntime
  'menu:command': MenuCommand
}
export type IpcEventName = keyof IpcEvents

export const IPC_EVENT_NAMES: readonly IpcEventName[] = ['runtime:logs', 'runtime:status', 'menu:command']

export type PlanForSave = StartupPlan

export interface BerranteApi {
  invoke<C extends IpcChannel>(channel: C, ...args: undefined extends IpcInput<C> ? [input?: IpcInput<C>] : [input: IpcInput<C>]): Promise<IpcEnvelope<IpcOutput<C>>>
  on<E extends IpcEventName>(event: E, listener: (payload: IpcEvents[E]) => void): () => void
}
