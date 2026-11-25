import type { LocalRepositoryRepository } from '@main/domain/repositories'
import { AppError } from '@main/domain/errors/AppError'

export async function assertReposExist(repos: LocalRepositoryRepository, ids: string[]): Promise<void> {
  for (const id of ids) {
    if (!(await repos.findById(id))) throw AppError.validation(`Repositório ${id} não existe no Berrante`)
  }
}
