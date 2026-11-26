import type { BlockShape, DraculaAccent } from './palette'
import type { RepoDetection, StartupPlan } from './startup'

/** Tropa: um projeto com N repositórios que sobem juntos. */
export interface Project {
  id: string
  name: string
  color: DraculaAccent
  icon: BlockShape
  repositoryIds: string[]
  /** Arquivo `.code-workspace` do VS Code aberto pelo botão da tropa (ausente em tropas antigas). */
  workspaceFile?: string | null
  plan: StartupPlan | null
  createdAt: string
  updatedAt: string
}

export interface ProjectInput {
  name: string
  color: DraculaAccent
  icon: BlockShape
  repositoryIds: string[]
  /** `undefined` mantém o atual ao editar; `null` remove. */
  workspaceFile?: string | null
}

export interface DetectionResult {
  plan: StartupPlan
  detections: RepoDetection[]
}
