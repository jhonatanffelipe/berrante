import { useEffect, useMemo, useState } from 'react'
import * as Menu from '@radix-ui/react-dropdown-menu'
import type { AiPlanSuggestion, Project, RepoDetection, ServiceDefinition, StartupPlan } from '@shared/types'
import { call, errorMessage } from '../../lib/api'
import { accentBg } from '../../lib/accent'
import { cn } from '../../lib/cn'
import { applyDiff } from '../../lib/planDiff'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelButton } from '../../components/ui/PixelButton'
import { Switch } from '../../components/ui/Switch'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../layout/AppData'
import { useTotp } from '../security/TotpProvider'
import { Badge } from '../../components/ui/Badge'
import { AiDiffDialog } from './AiDiffDialog'

const envToText = (env: Record<string, string>) => Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n')
const textToEnv = (text: string): Record<string, string> => {
  const env: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/)
    if (m) env[m[1]!] = m[2]!
  }
  return env
}

function DetectionSummary({ d }: { d: RepoDetection }) {
  return (
    <PixelBlock size="sm" accent={d.warnings.length ? 'orange' : 'line'} className="space-y-1 px-4 py-3 text-xs">
      <p className="label">{d.repoName}</p>
      <p className="text-comment">
        {d.packageManager ? `${d.packageManager.name}${d.packageManager.version ? `@${d.packageManager.version}` : ''} (via ${d.packageManager.source})` : 'sem package.json'}
        {d.compose ? ` · compose: ${d.compose.services.length} serviço(s) (${d.compose.source})` : ''}
        {` · ${d.scripts.filter((s) => s.category === 'service').length} script(s) longo(s), ${d.scripts.filter((s) => s.category === 'action').length} ação(ões)`}
      </p>
      {d.readme.length ? (
        <details className="text-comment">
          <summary className="cursor-pointer">README: {d.readme.map((r) => r.section).join(', ')}</summary>
          <pre className="selectable mt-1 whitespace-pre-wrap bg-darker p-2 text-fg/80">{d.readme.flatMap((r) => r.commands).join('\n')}</pre>
        </details>
      ) : null}
      {d.warnings.map((w) => <p key={w} className="text-orange">⚠ {w}</p>)}
    </PixelBlock>
  )
}

/** Plano de subida editável: ordem, quem entra no play, cwd, env e dependências. */
export function PlanEditor({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const { repos, upsertProject, settings } = useAppData()
  const toast = useToast()
  const withTotp = useTotp()
  const [draft, setDraft] = useState<StartupPlan | null>(project.plan)
  const [detections, setDetections] = useState<RepoDetection[]>([])
  const [busy, setBusy] = useState<'detect' | 'save' | 'ai' | null>(null)
  const [dirty, setDirty] = useState(false)
  const [suggestion, setSuggestion] = useState<AiPlanSuggestion | null>(null)

  const repoName = (id: string) => repos.find((r) => r.id === id)?.name ?? id
  const sorted = useMemo(() => [...(draft?.services ?? [])].sort((a, b) => a.order - b.order), [draft])

  const detect = async () => {
    setBusy('detect')
    try {
      const r = await call('startup:detect', { projectId: project.id })
      setDraft(r.plan)
      setDetections(r.detections)
      setDirty(true)
    } catch (err) {
      toast({ title: 'Falha na detecção', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    setDraft(project.plan)
    setDirty(false)
    setDetections([])
    if (!project.plan && project.repositoryIds.length) void detect()
  }, [project.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (id: string, patch: Partial<ServiceDefinition>) => {
    setDraft((p) => (p ? { ...p, services: p.services.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : p))
    setDirty(true)
  }

  const move = (id: string, dir: -1 | 1) => {
    const idx = sorted.findIndex((s) => s.id === id)
    const other = sorted[idx + dir]
    if (!other) return
    const reordered = [...sorted]
    reordered[idx] = other
    reordered[idx + dir] = sorted[idx]!
    setDraft((p) => (p ? { ...p, services: reordered.map((s, i) => ({ ...s, order: i * 10 })) } : p))
    setDirty(true)
  }

  const addCommand = () => {
    const repoId = project.repositoryIds[0]
    const repo = repos.find((r) => r.id === repoId)
    if (!draft || !repo) return
    const id = `user:${crypto.randomUUID().slice(0, 8)}`
    const svc: ServiceDefinition = { id, repoId: repo.id, name: 'novo comando', kind: 'command', command: 'echo "olá, boiada"', composeFile: null, cwd: repo.path, env: {}, enabled: false, order: (sorted.at(-1)?.order ?? 0) + 10, dependsOn: [], color: 'pink', origin: 'user' }
    setDraft({ ...draft, services: [...draft.services, svc] })
    setDirty(true)
  }

  const remove = (id: string) => {
    setDraft((p) => (p ? { ...p, services: p.services.filter((s) => s.id !== id).map((s) => ({ ...s, dependsOn: s.dependsOn.filter((d) => d !== id) })) } : p))
    setDirty(true)
  }

  const save = async (plan = draft) => {
    if (!plan) return
    setBusy('save')
    try {
      const saved = await call('startup:savePlan', { projectId: project.id, plan })
      upsertProject(saved)
      setDraft(saved.plan)
      setDirty(false)
      toast({ title: 'Plano salvo', accent: 'green' })
      onSaved()
    } catch (err) {
      toast({ title: 'Plano não salvo', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(null)
    }
  }

  const analyze = async () => {
    setBusy('ai')
    try {
      const s = await withTotp('A análise com IA exige o código 2FA.', (code) => call('startup:analyzeWithAi', { projectId: project.id, totpCode: code }))
      if (s) setSuggestion(s)
    } catch (err) {
      toast({ title: 'A IA não respondeu', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(null)
    }
  }

  const applySuggestion = (selected: Set<string>) => {
    if (!suggestion || !draft) return
    const next = applyDiff(draft, suggestion.diff, selected)
    setSuggestion(null)
    setDraft(next)
    setDirty(true)
    toast({ title: 'Sugestão aplicada no rascunho', body: 'Revise e clique em Salvar plano.', accent: 'purple' })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <PixelButton accent="cyan" onClick={() => void detect()} disabled={busy !== null}>{busy === 'detect' ? 'Detectando…' : 'Detectar de novo'}</PixelButton>
        <PixelButton onClick={addCommand} disabled={!draft}>+ Comando</PixelButton>
        {settings?.aiEnabled ? (
          <PixelButton onClick={() => void analyze()} disabled={busy !== null}>{busy === 'ai' ? 'A IA está lendo…' : 'Analisar com IA'}</PixelButton>
        ) : (
          <span className="text-xs text-comment">IA desligada (configurações → IA, exige 2FA)</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {busy ? <Spinner /> : null}
          {dirty ? <Badge tone="orange">não salvo</Badge> : null}
          <PixelButton accent="green" onClick={() => void save()} disabled={!draft || busy !== null}>Salvar plano</PixelButton>
        </div>
      </div>

      {detections.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{detections.map((d) => <DetectionSummary key={d.repoId} d={d} />)}</div> : null}

      {!draft ? (
        <p className="text-comment">Sem plano ainda. Clique em detectar.</p>
      ) : (
        <PixelBlock className="divide-y-2 divide-line/60">
          <div className="grid grid-cols-[52px_44px_1fr_1.6fr_1fr_120px_36px] gap-3 px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-comment">
            <span>ordem</span>
            <span>play</span>
            <span>serviço</span>
            <span>comando / cwd</span>
            <span>env</span>
            <span>depende de</span>
            <span />
          </div>
          {sorted.map((s, i) => (
            <div key={s.id} className={cn('grid grid-cols-[52px_44px_1fr_1.6fr_1fr_120px_36px] items-start gap-3 px-3 py-2', !s.enabled && 'opacity-70')}>
              <div className="flex gap-1">
                <button className="bg-line px-1.5 disabled:opacity-30" disabled={i === 0} onClick={() => move(s.id, -1)} aria-label="Subir">▲</button>
                <button className="bg-line px-1.5 disabled:opacity-30" disabled={i === sorted.length - 1} onClick={() => move(s.id, 1)} aria-label="Descer">▼</button>
              </div>
              <Switch checked={s.enabled} onCheckedChange={(v) => update(s.id, { enabled: v })} label={`Incluir ${s.name} no play`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('h-3 w-3 shrink-0 rounded-[1px]', accentBg[s.color])} />
                  <input className="pixel-input !py-1" value={s.name} onChange={(e) => update(s.id, { name: e.target.value })} />
                </div>
                <p className="mt-1 text-xs text-comment">{repoName(s.repoId)} · {s.kind}{s.origin !== 'detected' ? ` · ${s.origin}` : ''}</p>
              </div>
              <div className="space-y-1">
                <input className="pixel-input !py-1 font-mono text-xs" value={s.command} disabled={s.kind === 'compose'} onChange={(e) => update(s.id, { command: e.target.value })} />
                <input className="pixel-input !py-1 text-xs text-comment" value={s.cwd} onChange={(e) => update(s.id, { cwd: e.target.value })} />
              </div>
              <textarea className="pixel-input h-[58px] resize-none !py-1 text-xs" placeholder="KEY=valor" defaultValue={envToText(s.env)} onBlur={(e) => update(s.id, { env: textToEnv(e.target.value) })} />
              <Menu.Root>
                <Menu.Trigger asChild>
                  <button className="pixel-input truncate !py-1 text-left text-xs">{s.dependsOn.length ? s.dependsOn.map((d) => draft.services.find((x) => x.id === d)?.name ?? d).join(', ') : 'nada'}</button>
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Content className="pixel-block pixel-block-sm z-50 max-h-72 overflow-auto bg-darker p-1">
                    {sorted.filter((o) => o.id !== s.id).map((o) => (
                      <Menu.CheckboxItem
                        key={o.id}
                        checked={s.dependsOn.includes(o.id)}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={(c) => update(s.id, { dependsOn: c ? [...s.dependsOn, o.id] : s.dependsOn.filter((d) => d !== o.id) })}
                        className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs outline-none data-[highlighted]:bg-line"
                      >
                        <span className="w-3">{s.dependsOn.includes(o.id) ? '■' : '□'}</span>
                        {repoName(o.repoId)}/{o.name}
                      </Menu.CheckboxItem>
                    ))}
                  </Menu.Content>
                </Menu.Portal>
              </Menu.Root>
              {s.origin === 'detected' ? <span /> : <button className="bg-red/20 px-2 py-1 text-red" onClick={() => remove(s.id)} aria-label="Remover">✕</button>}
            </div>
          ))}
        </PixelBlock>
      )}
      <AiDiffDialog suggestion={suggestion} onClose={() => setSuggestion(null)} onApply={applySuggestion} />
    </div>
  )
}
