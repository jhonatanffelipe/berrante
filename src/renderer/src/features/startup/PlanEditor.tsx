import { useEffect, useMemo, useState } from 'react'
import type { AiWorkflowSuggestion, LocalRepository, Project, RepoDetection, ServiceDefinition, StartupPlan, WaitFor } from '@shared/types'
import { stepWaitFor, WAIT_FOR_HINT, WAIT_FOR_LABEL } from '@shared/workflow'
import { call, errorMessage } from '../../lib/api'
import { accentBg } from '../../lib/accent'
import { cn } from '../../lib/cn'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelButton } from '../../components/ui/PixelButton'
import { Switch } from '../../components/ui/Switch'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../layout/AppData'
import { useTotp } from '../security/TotpProvider'
import { Badge } from '../../components/ui/Badge'
import { AiWorkflowDialog, type ApplyMode } from './AiWorkflowDialog'
import { folderLabel } from './folderLabel'

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

const WAIT_OPTIONS: WaitFor[] = ['exit', 'port', 'start']

/** Rascunho sempre na ordem visível, com `order` contínuo e sem o `dependsOn` legado. */
function normalize(plan: StartupPlan | null): StartupPlan | null {
  if (!plan) return null
  const services = [...plan.services].sort((a, b) => a.order - b.order).map((s, i) => ({ ...s, order: i * 10, waitFor: stepWaitFor(s), dependsOn: [] }))
  return { ...plan, services }
}

function StepRow({
  step,
  index,
  total,
  repos,
  onChange,
  onMove,
  onRemove,
  onPickFolder
}: {
  step: ServiceDefinition
  index: number
  total: number
  repos: LocalRepository[]
  onChange: (patch: Partial<ServiceDefinition>) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onPickFolder: () => void
}) {
  const envCount = Object.keys(step.env).length
  const [showEnv, setShowEnv] = useState(envCount > 0)
  const legacy = step.kind === 'compose'
  const waitFor = stepWaitFor(step)

  return (
    <div className={cn('space-y-2 px-4 py-3', !step.enabled && 'opacity-60')}>
      <div className="grid grid-cols-[28px_52px_44px_minmax(140px,220px)_1fr_auto_36px] items-center gap-3">
        <span className="font-mono text-sm text-comment">{String(index + 1).padStart(2, '0')}</span>
        <div className="flex gap-1">
          <button className="bg-line px-1.5 disabled:opacity-30" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Subir">▲</button>
          <button className="bg-line px-1.5 disabled:opacity-30" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Descer">▼</button>
        </div>
        <Switch checked={step.enabled} onCheckedChange={(v) => onChange({ enabled: v })} label={`Incluir ${step.name} no play`} />
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('h-3 w-3 shrink-0 rounded-[1px]', accentBg[step.color])} />
          <input className="pixel-input !py-1" placeholder="nome" value={step.name} onChange={(e) => onChange({ name: e.target.value })} aria-label="Nome do passo" />
        </div>
        {legacy ? (
          <p className="text-xs text-orange">container &quot;{step.command}&quot; no formato antigo: use Detectar de novo</p>
        ) : (
          <input className="pixel-input !py-1 font-mono text-xs" placeholder="comando, ex: yarn dev" value={step.command} onChange={(e) => onChange({ command: e.target.value })} aria-label="Comando" />
        )}
        <label className="flex items-center gap-2 text-xs text-comment" title={WAIT_FOR_HINT[waitFor]}>
          segue ao
          <select className="pixel-input !w-auto !py-1 text-xs" value={waitFor} disabled={legacy} onChange={(e) => onChange({ waitFor: e.target.value as WaitFor, kind: e.target.value === 'exit' ? 'setup' : step.kind === 'setup' ? 'command' : step.kind })}>
            {WAIT_OPTIONS.map((w) => <option key={w} value={w}>{WAIT_FOR_LABEL[w]}</option>)}
          </select>
        </label>
        <button className="bg-red/20 px-2 py-1 text-red" onClick={onRemove} aria-label={`Remover ${step.name}`}>✕</button>
      </div>
      <div className="ml-[164px] grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs text-comment">pasta</span>
          <button className="pixel-input truncate !py-1 text-left font-mono text-xs" onClick={onPickFolder} title={step.cwd}>{folderLabel(repos, step.cwd)}</button>
          <PixelButton size="sm" onClick={onPickFolder}>Escolher…</PixelButton>
        </div>
        <button className="text-xs text-comment hover:text-fg" onClick={() => setShowEnv((v) => !v)}>{showEnv ? '− env' : `+ env${envCount ? ` (${envCount})` : ''}`}</button>
      </div>
      {showEnv ? (
        <textarea
          key={`${step.id}:${envToText(step.env)}`}
          className="pixel-input ml-[164px] !w-[calc(100%-164px)] h-[64px] resize-y !py-1 font-mono text-xs"
          placeholder={'KEY=valor\nOUTRA=valor'}
          defaultValue={envToText(step.env)}
          onBlur={(e) => onChange({ env: textToEnv(e.target.value) })}
        />
      ) : null}
    </div>
  )
}

/** Workflow de subida: passos rodam de cima para baixo; cada um diz pasta, comando, env e quando seguir. */
export function PlanEditor({ project, onSaved }: { project: Project; onSaved: () => void }) {
  const { repos, upsertProject, settings } = useAppData()
  const toast = useToast()
  const withTotp = useTotp()
  const [draft, setDraft] = useState<StartupPlan | null>(normalize(project.plan))
  const [detections, setDetections] = useState<RepoDetection[]>([])
  const [busy, setBusy] = useState<'detect' | 'save' | 'ai' | null>(null)
  const [dirty, setDirty] = useState(false)
  const [suggestion, setSuggestion] = useState<AiWorkflowSuggestion | null>(null)

  const projectRepos = useMemo(() => project.repositoryIds.map((id) => repos.find((r) => r.id === id)).filter((r): r is LocalRepository => Boolean(r)), [project.repositoryIds, repos])
  const steps = draft?.services ?? []

  const setSteps = (next: ServiceDefinition[]) => {
    setDraft((p) => (p ? { ...p, services: next.map((s, i) => ({ ...s, order: i * 10 })) } : p))
    setDirty(true)
  }

  const detect = async () => {
    setBusy('detect')
    try {
      const r = await call('startup:detect', { projectId: project.id })
      setDraft(normalize(r.plan))
      setDetections(r.detections)
      setDirty(true)
    } catch (err) {
      toast({ title: 'Falha na detecção', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    setDraft(normalize(project.plan))
    setDirty(false)
    setDetections([])
    if (!project.plan && project.repositoryIds.length) void detect()
  }, [project.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (id: string, patch: Partial<ServiceDefinition>) => setSteps(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...steps]
    const [item] = next.splice(idx, 1)
    next.splice(idx + dir, 0, item!)
    setSteps(next)
  }

  const addStep = () => {
    const repo = projectRepos[0]
    if (!repo) return
    const base: StartupPlan = draft ?? { services: [], actions: [], detectedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    const step: ServiceDefinition = { id: `user:${crypto.randomUUID().slice(0, 8)}`, repoId: repo.id, name: `passo ${base.services.length + 1}`, kind: 'command', command: '', composeFile: null, cwd: repo.path, env: {}, enabled: true, order: 0, waitFor: 'start', dependsOn: [], color: 'pink', origin: 'user' }
    setDraft({ ...base, services: [...base.services, step].map((s, i) => ({ ...s, order: i * 10 })) })
    setDirty(true)
  }

  const pickFolder = async (step: ServiceDefinition) => {
    try {
      const folder = await call('startup:pickFolder', { projectId: project.id, defaultPath: step.cwd })
      if (folder) {
        const repo = projectRepos.filter((r) => folder === r.path || folder.startsWith(`${r.path}/`)).sort((a, b) => b.path.length - a.path.length)[0]
        update(step.id, { cwd: folder, ...(repo ? { repoId: repo.id } : {}) })
      }
    } catch (err) {
      toast({ title: 'Pasta não aceita', body: errorMessage(err), accent: 'orange' })
    }
  }

  const save = async () => {
    if (!draft) return
    setBusy('save')
    try {
      const saved = await call('startup:savePlan', { projectId: project.id, plan: draft })
      upsertProject(saved)
      setDraft(normalize(saved.plan))
      setDirty(false)
      toast({ title: 'Workflow salvo', accent: 'green' })
      onSaved()
    } catch (err) {
      toast({ title: 'Workflow não salvo', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(null)
    }
  }

  const analyze = async () => {
    setBusy('ai')
    try {
      const s = await withTotp('A sugestão da IA exige o código 2FA.', (code) => call('startup:analyzeWithAi', { projectId: project.id, totpCode: code }))
      if (s) setSuggestion(s)
    } catch (err) {
      toast({ title: 'A IA não respondeu', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(null)
    }
  }

  const applySuggestion = (selected: Set<string>, mode: ApplyMode) => {
    if (!suggestion) return
    const picked = suggestion.steps.filter((s) => selected.has(s.step.id)).map((s) => s.step)
    const base: StartupPlan = draft ?? { services: [], actions: [], detectedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    const kept = mode === 'replace' ? [] : base.services.filter((s) => !picked.some((p) => p.id === s.id))
    setSuggestion(null)
    setDraft({ ...base, services: [...kept, ...picked].map((s, i) => ({ ...s, order: i * 10 })) })
    setDirty(true)
    toast({ title: mode === 'replace' ? 'Workflow da IA no rascunho' : 'Passos da IA adicionados', body: 'Revise e clique em Salvar workflow.', accent: 'purple' })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <PixelButton onClick={addStep} disabled={!projectRepos.length}>+ Passo</PixelButton>
        <PixelButton accent="cyan" onClick={() => void detect()} disabled={busy !== null}>{busy === 'detect' ? 'Detectando…' : 'Detectar de novo'}</PixelButton>
        {settings?.aiEnabled ? (
          <PixelButton onClick={() => void analyze()} disabled={busy !== null}>{busy === 'ai' ? 'A IA está lendo…' : 'Sugerir workflow com IA'}</PixelButton>
        ) : (
          <span className="text-xs text-comment">IA desligada (configurações → IA, exige 2FA)</span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {busy ? <Spinner /> : null}
          {dirty ? <Badge tone="orange">não salvo</Badge> : null}
          <PixelButton accent="green" onClick={() => void save()} disabled={!draft || busy !== null}>Salvar workflow</PixelButton>
        </div>
      </div>

      <p className="text-xs text-comment">
        Os passos rodam de cima para baixo. Cada um só começa quando o anterior <b className="text-fg">termina</b>, <b className="text-fg">abre uma porta</b> ou <b className="text-fg">inicia</b>, conforme o &quot;segue ao&quot;. Se um passo falhar, os seguintes não rodam.
      </p>

      {detections.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{detections.map((d) => <DetectionSummary key={d.repoId} d={d} />)}</div> : null}

      {!steps.length ? (
        <p className="text-comment">Nenhum passo ainda. Clique em + Passo, Detectar de novo ou peça uma sugestão à IA.</p>
      ) : (
        <PixelBlock className="divide-y-2 divide-line/60">
          {steps.map((s, i) => (
            <StepRow
              key={s.id}
              step={s}
              index={i}
              total={steps.length}
              repos={projectRepos}
              onChange={(patch) => update(s.id, patch)}
              onMove={(dir) => move(i, dir)}
              onRemove={() => setSteps(steps.filter((x) => x.id !== s.id))}
              onPickFolder={() => void pickFolder(s)}
            />
          ))}
        </PixelBlock>
      )}
      <AiWorkflowDialog suggestion={suggestion} repos={projectRepos} onClose={() => setSuggestion(null)} onApply={applySuggestion} />
    </div>
  )
}
