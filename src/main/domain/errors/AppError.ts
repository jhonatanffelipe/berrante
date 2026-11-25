import type { ErrorCode, SerializedError } from '@shared/types'

/** Erro de aplicação esperado. Tudo que não for AppError vira INTERNAL no handler. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = 'AppError'
  }

  static notFound(what: string): AppError {
    return new AppError('NOT_FOUND', `${what} não encontrado(a)`)
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError('VALIDATION', message, details)
  }

  toJSON(): SerializedError {
    return { code: this.code, message: this.message, details: this.details }
  }
}
