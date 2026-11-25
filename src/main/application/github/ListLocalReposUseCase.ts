import type { LocalRepository } from '@shared/types'
import type { LocalRepositoryRepository } from '@main/domain/repositories'

export class ListLocalReposUseCase {
  constructor(private readonly repos: LocalRepositoryRepository) {}
  execute(): Promise<LocalRepository[]> {
    return this.repos.list()
  }
}
