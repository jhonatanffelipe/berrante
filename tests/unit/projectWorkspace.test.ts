import { describe, expect, it } from 'vitest'
import { ProjectEntity } from '@main/domain/entities/Project'
import { ipcSchemas } from '@shared/ipc/schemas'

const NOW = new Date('2026-11-26T12:00:00Z')
const input = { name: 'Fazenda', color: 'green' as const, icon: 'tee' as const, repositoryIds: ['api'] }

describe('workspace do VS Code na tropa', () => {
  it('cria sem workspace e com workspace', () => {
    expect(ProjectEntity.create(input, 'p1', NOW).workspaceFile).toBeNull()
    expect(ProjectEntity.create({ ...input, workspaceFile: ' /w/fazenda.code-workspace ' }, 'p1', NOW).workspaceFile).toBe('/w/fazenda.code-workspace')
  })

  it('ao editar, undefined mantém e null remove', () => {
    const p = ProjectEntity.create({ ...input, workspaceFile: '/w/fazenda.code-workspace' }, 'p1', NOW)
    expect(ProjectEntity.update(p, input, NOW).workspaceFile).toBe('/w/fazenda.code-workspace')
    expect(ProjectEntity.update(p, { ...input, workspaceFile: null }, NOW).workspaceFile).toBeNull()
    expect(ProjectEntity.update({ ...p, workspaceFile: undefined }, input, NOW).workspaceFile).toBeNull()
  })

  it('recusa o que não é .code-workspace absoluto', () => {
    expect(() => ProjectEntity.create({ ...input, workspaceFile: '/w/fazenda.json' }, 'p1', NOW)).toThrow('.code-workspace')
    expect(() => ProjectEntity.create({ ...input, workspaceFile: 'fazenda.code-workspace' }, 'p1', NOW)).toThrow('.code-workspace')
  })

  it('o schema IPC valida o caminho', () => {
    const schema = ipcSchemas['projects:create']
    expect(schema.safeParse({ ...input, workspaceFile: '/w/fazenda.code-workspace' }).success).toBe(true)
    expect(schema.safeParse({ ...input, workspaceFile: null }).success).toBe(true)
    expect(schema.safeParse({ ...input, workspaceFile: '/w/x.sh' }).success).toBe(false)
  })
})
