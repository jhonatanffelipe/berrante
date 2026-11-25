import type { BlockShape, DraculaAccent } from './palette'
import type { RepoDetection, StartupPlan } from './startup'

/** Tropa: um projeto com N repositórios que sobem juntos. */
export interface Project {
  id: string
  name: string
  color: DraculaAccent
  icon: BlockShape
  repositoryIds: string[]
  plan: StartupPlan | null
  createdAt: string
  updatedAt: string
}

export interface ProjectInput {
  name: string
  color: DraculaAccent
  icon: BlockShape
  repositoryIds: string[]
}

export interface DetectionResult {
  plan: StartupPlan
  detections: RepoDetection[]
}
