import { useEffect, useState } from 'react'
import type { GithubRepo, RepoCloneFilter, RepoListResult, RepoVisibilityFilter } from '@shared/types'
import { call, errorMessage } from '../../lib/api'
import { shortPath } from '../../lib/format'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelButton } from '../../components/ui/PixelButton'
import { Tabs, TabsContent, TabsList } from '../../components/ui/Tabs'
import { Spinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { Dialog } from '../../components/ui/Dialog'
import { Field } from '../../components/ui/Field'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../layout/AppData'
import { PageTitle } from '../../components/ui/PageTitle'
import { Badge } from '../../components/ui/Badge'
import { LoginCard } from '../auth/LoginCard'

const PER_PAGE = 25

function GithubTab() {
  const { settings, reloadRepos, auth } = useAppData()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [owner, setOwner] = useState('')
  const [visibility, setVisibility] = useState<RepoVisibilityFilter>('all')
  const [cloned, setCloned] = useState<RepoCloneFilter>('all')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<RepoListResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cloning, setCloning] = useState<GithubRepo | null>(null)
  const [subdir, setSubdir] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async (refresh = false) => {
    setLoading(true)
    try {
      setResult(await call('github:listRepos', { search: search || undefined, owner: owner || undefined, visibility, cloned, page, perPage: PER_PAGE, refresh }))
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 250 : 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, owner, visibility, cloned, page, auth?.authenticated])

  const clone = async () => {
    if (!cloning) return
    setBusy(true)
    try {
      const r = await call('repos:clone', { fullName: cloning.fullName, subdir: subdir || undefined })
      toast({ title: 'Clonado!', body: shortPath(r.repository.path), accent: 'green' })
      setCloning(null)
      await reloadRepos()
      await load()
    } catch (err) {
      toast({ title: 'Falha no clone', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(false)
    }
  }

  if (!auth?.authenticated) return <div className="py-8"><LoginCard /></div>
  const pages = result ? Math.max(1, Math.ceil(result.total / PER_PAGE)) : 1

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <input className="pixel-input max-w-xs" placeholder="Buscar repositório…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <select className="pixel-input w-40" value={owner} onChange={(e) => { setOwner(e.target.value); setPage(1) }}>
          <option value="">Todos os donos</option>
          {result?.owners.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className="pixel-input w-32" value={visibility} onChange={(e) => { setVisibility(e.target.value as RepoVisibilityFilter); setPage(1) }}>
          <option value="all">Todos</option>
          <option value="private">Privados</option>
          <option value="public">Públicos</option>
        </select>
        <select className="pixel-input w-36" value={cloned} onChange={(e) => { setCloned(e.target.value as RepoCloneFilter); setPage(1) }}>
          <option value="all">Clonados ou não</option>
          <option value="cloned">Já clonados</option>
          <option value="not-cloned">Não clonados</option>
        </select>
        <PixelButton onClick={() => void load(true)} disabled={loading}>Atualizar</PixelButton>
        {loading ? <Spinner /> : null}
      </div>
      {error ? <p className="text-red">{error}</p> : null}
      <div className="grid gap-3">
        {result?.items.map((r) => (
          <PixelBlock key={r.id} size="sm" accent={r.localPath ? 'green' : 'line'} className="flex items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-fg">{r.fullName}</span>
                {r.private ? <Badge tone="pink">privado</Badge> : null}
                {r.fork ? <Badge>fork</Badge> : null}
                {r.archived ? <Badge tone="orange">arquivado</Badge> : null}
              </div>
              <p className="truncate text-xs text-comment">{r.description ?? 'sem descrição'}{r.language ? ` · ${r.language}` : ''}</p>
              {r.localPath ? <p className="mt-1 font-mono text-xs text-green">✓ {shortPath(r.localPath)}</p> : null}
            </div>
            <a href={r.htmlUrl} target="_blank" rel="noreferrer" className="text-xs text-cyan hover:underline">GitHub ↗</a>
            {!r.localPath ? (
              <PixelButton accent="cyan" onClick={() => { setCloning(r); setSubdir('') }}>Clonar</PixelButton>
            ) : null}
          </PixelBlock>
        ))}
        {result && result.items.length === 0 ? <EmptyState title="Nenhum repo nesse filtro" /> : null}
      </div>
      {result && result.total > PER_PAGE ? (
        <div className="flex items-center justify-center gap-3">
          <PixelButton disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</PixelButton>
          <span className="font-mono text-sm font-bold">{page} / {pages} · {result.total} repos</span>
          <PixelButton disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>›</PixelButton>
        </div>
      ) : null}

      <Dialog open={cloning !== null} onOpenChange={(o) => !o && setCloning(null)} title={`Clonar ${cloning?.name ?? ''}`} accent="cyan">
        <div className="space-y-4">
          <Field label="Subpasta (opcional)" hint={`Destino: ${shortPath(`${settings?.cloneRoot ?? ''}/${subdir ? `${subdir}/` : ''}${cloning?.name ?? ''}`)}`}>
            <input className="pixel-input" placeholder="ex: clientes" value={subdir} onChange={(e) => setSubdir(e.target.value.trim())} />
          </Field>
          <p className="text-xs text-comment">O token vai só por GIT_ASKPASS: o remote fica limpo, sem credencial.</p>
          <div className="flex justify-end gap-2">
            <PixelButton onClick={() => setCloning(null)}>Cancelar</PixelButton>
            <PixelButton accent="cyan" onClick={() => void clone()} disabled={busy}>{busy ? 'Clonando…' : 'Clonar'}</PixelButton>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

function LocalTab() {
  const { repos, reloadRepos, reloadProjects } = useAppData()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id)
    try {
      await fn()
      toast({ title: ok, accent: 'green' })
    } catch (err) {
      toast({ title: 'Deu ruim', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(null)
    }
  }

  const importFolder = () =>
    run('import', async () => {
      const r = await call('repos:importFolder', {})
      if (r) await reloadRepos()
    }, 'Pasta importada')

  return (
    <div className="space-y-4 pt-4">
      <div className="flex gap-3">
        <PixelButton accent="accent" onClick={() => void importFolder()} disabled={busy === 'import'}>Importar pasta local</PixelButton>
      </div>
      {repos.length === 0 ? (
        <EmptyState title="Nenhum repositório local">Clone do GitHub ou importe uma pasta que já existe na sua máquina.</EmptyState>
      ) : (
        <div className="grid gap-3">
          {repos.map((r) => (
            <PixelBlock key={r.id} size="sm" className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-fg">{r.name}</p>
                <p className="truncate text-xs text-comment">{shortPath(r.path)}{r.githubFullName ? ` · ${r.githubFullName}` : ''}</p>
              </div>
              <PixelButton size="sm" onClick={() => void call('repos:reveal', { repoId: r.id })}>Finder</PixelButton>
              <PixelButton size="sm" accent="cyan" disabled={busy === r.id} onClick={() => void run(r.id, () => call('repos:pull', { repoId: r.id }), `git pull em ${r.name}`)}>
                {busy === r.id ? '…' : 'Pull'}
              </PixelButton>
              <PixelButton size="sm" accent="red" onClick={() => void run(r.id, async () => { await call('repos:remove', { repoId: r.id }); await reloadRepos(); await reloadProjects() }, 'Removido do Berrante (a pasta continua)')}>
                Remover
              </PixelButton>
            </PixelBlock>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReposPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle index="R" title="Repositórios" />
      <Tabs defaultValue="local">
        <TabsList items={[{ value: 'local', label: 'Na máquina' }, { value: 'github', label: 'No GitHub' }]} />
        <TabsContent value="local"><LocalTab /></TabsContent>
        <TabsContent value="github"><GithubTab /></TabsContent>
      </Tabs>
    </div>
  )
}
