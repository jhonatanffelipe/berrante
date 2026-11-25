import { describe, expect, it } from 'vitest'
import { IPC_CHANNELS } from '@shared/ipc/channels'
import { ipcSchemas } from '@shared/ipc/schemas'

describe('contrato IPC', () => {
  it('a lista do preload bate com os schemas do main', () => {
    expect([...IPC_CHANNELS].sort()).toEqual(Object.keys(ipcSchemas).sort())
  })
})
