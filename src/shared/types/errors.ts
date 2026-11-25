export type ErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNAUTHENTICATED'
  | 'TOTP_REQUIRED'
  | 'TOTP_INVALID'
  | 'TOTP_NOT_CONFIGURED'
  | 'GITHUB'
  | 'GIT'
  | 'DOCKER'
  | 'PROCESS'
  | 'AI'
  | 'IO'
  | 'INTERNAL'

export interface SerializedError {
  code: ErrorCode
  message: string
  details?: unknown
}

export type IpcEnvelope<T> = { ok: true; data: T } | { ok: false; error: SerializedError }
