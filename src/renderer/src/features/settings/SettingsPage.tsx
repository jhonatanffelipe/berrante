import { useState } from 'react'
import type { AiCliName, AiCliStatus, TerminalApp, TotpSetup, TotpStatus } from '@shared/types'
import { TERMINAL_APPS } from '@shared/types/settings'
import { ACCENTS, ACCENT_NAMES, isPresetTheme } from '@shared/theme'
import { cn } from '../../lib/cn'
import { call, errorMessage } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { shortPath } from '../../lib/format'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelButton } from '../../components/ui/PixelButton'
import { Switch } from '../../components/ui/Switch'
import { Field } from '../../components/ui/Field'
import { Dialog } from '../../components/ui/Dialog'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../layout/AppData'
import { PageTitle } from '../../components/ui/PageTitle'
import { useTotp } from '../security/TotpProvider'

function Section({ title, children, accent = 'line' as const }: { title: string; children: React.ReactNode; accent?: 'line' | 'purple' | 'yellow' | 'red' | 'cyan' | 'accent' }) {
  return (
    <PixelBlock accent={accent} className="space-y-4 p-5">
      <h3 className="label">{title}</h3>
      {children}
    </PixelBlock>
  )
}

/** Amostra do Drácula: fundo, roxo, rosa, verde e ciano da paleta oficial. */
const DRACULA_SWATCH = ['#282a36', '#bd93f9', '#ff79c6', '#50fa7b', '#8be9fd']

function AccentChip({ active, label, colors, onClick }: { active: boolean; label: string; colors: string[]; onClick: () => void }) {
  const glow = colors[colors.length > 1 ? 1 : 0]
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex items-center gap-2 rounded border px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.12em]', active ? 'border-accent bg-accent/10 text-fg' : 'border-line text-comment hover:text-fg')}
    >
      <span className="flex overflow-hidden rounded-[2px]" style={{ boxShadow: active ? `0 0 10px ${glow}` : undefined }}>
        {colors.map((c) => (
          <span key={c} className={cn('h-3.5', colors.length > 1 ? 'w-1.5' : 'w-3.5')} style={{ background: c }} />
        ))}
      </span>
      {label}
    </button>
  )
}

function TotpSection({ status, onChange }: { status: TotpStatus | null; onChange: (s: TotpStatus) => void }) {
  const toast = useToast()
  const [setup, setSetup] = useState<TotpSetup | null>(null)
  const [code, setCode] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [disableCode, setDisableCode] = useState('')

  const begin = async () => {
    try {
      setSetup(await call('security:totpBeginSetup'))
      setCode('')
    } catch (err) {
      toast({ title: 'Falha no 2FA', body: errorMessage(err), accent: 'red' })
    }
  }
  const confirm = async () => {
    try {
      onChange(await call('security:totpConfirm', { code }))
      setCodes(setup?.recoveryCodes ?? null)
      setSetup(null)
      toast({ title: '2FA ativo', accent: 'green' })
    } catch (err) {
      toast({ title: 'Código não confere', body: errorMessage(err), accent: 'red' })
    }
  }
  const disable = async () => {
    try {
      onChange(await call('security:totpDisable', { code: disableCode }))
      setDisableCode('')
      toast({ title: '2FA desligado (IA desligada junto)', accent: 'orange' })
    } catch (err) {
      toast({ title: 'Não desligou', body: errorMessage(err), accent: 'red' })
    }
  }
  const regenerate = async () => {
    try {
      setCodes(await call('security:regenerateRecovery', { code: disableCode }))
      setDisableCode('')
      onChange(await call('security:totpStatus'))
    } catch (err) {
      toast({ title: 'Não gerou', body: errorMessage(err), accent: 'red' })
    }
  }

  return (
    <Section title="Autenticação em dois fatores (TOTP)">
      <p className="text-comment">Exigida para habilitar e usar a IA e para matar processos que não são do Berrante. O segredo fica cifrado no safeStorage.</p>
      {status?.enabled ? (
        <div className="space-y-3">
          <p className="text-green">■ Ativo · {status.recoveryCodesLeft} código(s) de recuperação restantes</p>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Código atual">
              <input className="pixel-input w-40" value={disableCode} onChange={(e) => setDisableCode(e.target.value)} maxLength={11} />
            </Field>
            <PixelButton accent="yellow" disabled={disableCode.length < 6} onClick={() => void regenerate()}>Novos códigos de recuperação</PixelButton>
            <PixelButton accent="red" disabled={disableCode.length < 6} onClick={() => void disable()}>Desligar 2FA</PixelButton>
          </div>
        </div>
      ) : (
        <PixelButton accent="yellow" onClick={() => void begin()}>Configurar 2FA</PixelButton>
      )}

      <Dialog open={setup !== null} onOpenChange={(o) => !o && setSetup(null)} title="Configurar 2FA" description="Escaneie no Google Authenticator, 1Password ou similar." accent="yellow">
        {setup ? (
          <div className="space-y-4">
            <div className="flex gap-5">
              <img src={setup.qrDataUrl} alt="QR code do 2FA" className="h-48 w-48 [image-rendering:pixelated]" />
              <div className="min-w-0 space-y-2 text-xs">
                <p className="text-comment">Ou digite o segredo:</p>
                <code className="selectable block break-all bg-darker p-2 text-yellow">{setup.secret}</code>
              </div>
            </div>
            <Field label="Código de 6 dígitos do app">
              <input className="pixel-input text-center font-mono !text-xl font-bold tracking-[0.4em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} maxLength={6} autoFocus />
            </Field>
            <div className="flex justify-end gap-2">
              <PixelButton onClick={() => setSetup(null)}>Cancelar</PixelButton>
              <PixelButton accent="yellow" disabled={code.length !== 6} onClick={() => void confirm()}>Ativar</PixelButton>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog open={codes !== null} onOpenChange={(o) => !o && setCodes(null)} title="Códigos de recuperação" description="Guarde agora (ex: no 1Password). Cada um vale uma vez e eles não serão mostrados de novo." accent="yellow">
        <div className="selectable grid grid-cols-2 gap-2 rounded border border-line bg-darker p-4 font-mono text-lg font-bold text-accent">
          {codes?.map((c) => <span key={c}>{c}</span>)}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <PixelButton
            onClick={() =>
              void navigator.clipboard
                .writeText(codes?.join('\n') ?? '')
                .then(() => toast({ title: 'Códigos copiados', body: 'Cole no seu gerenciador de senhas.', accent: 'green' }))
                .catch((err: unknown) => toast({ title: 'Não copiou', body: errorMessage(err), accent: 'red' }))
            }
          >
            Copiar
          </PixelButton>
          <PixelButton accent="yellow" onClick={() => setCodes(null)}>Guardei</PixelButton>
        </div>
      </Dialog>
    </Section>
  )
}

export function SettingsPage() {
  const { settings, setSettings, auth, setAuth } = useAppData()
  const toast = useToast()
  const withTotp = useTotp()
  const totp = useAsync(() => call('security:totpStatus'), [])
  const ai = useAsync<AiCliStatus[]>(() => call('settings:aiStatus'), [])

  if (!settings) return null
  const preset = isPresetTheme(settings.accent)

  const patch = async (p: Parameters<typeof call<'settings:update'>>[1]) => {
    try {
      setSettings(await call('settings:update', p))
    } catch (err) {
      toast({ title: 'Não salvou', body: errorMessage(err), accent: 'red' })
    }
  }

  const toggleAi = async (enabled: boolean) => {
    try {
      const s = await withTotp('Habilitar a integração com IA exige o código 2FA.', (code) => call('settings:setAiEnabled', { enabled, totpCode: code }))
      if (s) setSettings(s)
    } catch (err) {
      toast({ title: 'IA não mudou', body: errorMessage(err), accent: 'red' })
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle index="C" title="Configurações" />

      <Section title="Pasta raiz dos clones">
        <div className="flex items-center gap-3">
          <code className="selectable flex-1 bg-darker px-3 py-2">{shortPath(settings.cloneRoot)}</code>
          <PixelButton onClick={async () => setSettings(await call('settings:pickCloneRoot'))}>Escolher…</PixelButton>
        </div>
      </Section>

      <Section title="IA (fallback de detecção)">
        <Field label="CLI">
          <div className="flex gap-3">
            {(ai.data ?? []).map((c) => (
              <label key={c.name} className="flex cursor-pointer items-center gap-2 bg-darker px-3 py-2">
                <input type="radio" name="ai-cli" className="accent-[rgb(var(--c-purple))]" checked={settings.aiCli === c.name} onChange={() => void patch({ aiCli: c.name as AiCliName })} />
                <span>{c.name === 'claude' ? 'Claude Code' : 'Antigravity'}</span>
                <span className={c.available ? 'text-green' : 'text-red'}>{c.available ? '●' : '○ não encontrado'}</span>
              </label>
            ))}
          </div>
        </Field>
        <div className="flex items-center gap-3">
          <Switch checked={settings.aiEnabled} onCheckedChange={(v) => void toggleAi(v)} disabled={!totp.data?.enabled} label="Habilitar IA" />
          <span>{settings.aiEnabled ? 'Integração habilitada' : 'Integração desligada'}</span>
          {!totp.data?.enabled ? <span className="text-xs text-orange">configure o 2FA primeiro</span> : null}
        </div>
        <p className="text-xs text-comment">A CLI roda em modo não interativo e somente leitura. A sugestão vira um diff: nada é aplicado ou executado sem confirmação.</p>
      </Section>

      <TotpSection status={totp.data} onChange={(s) => { totp.setData(s); if (!s.enabled) void call('settings:get').then(setSettings) }} />

      <Section title="Aparência">
        <Field label="Cor de destaque" hint={preset ? 'Drácula usa a paleta oficial inteira: fundo, texto e cores de status.' : 'O fundo escuro é tingido com o tom da cor escolhida.'}>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_NAMES.filter((n) => !isPresetTheme(n)).map((name) => (
              <AccentChip key={name} active={settings.accent === name} label={ACCENTS[name].label} colors={[ACCENTS[name].hex]} onClick={() => void patch({ accent: name })} />
            ))}
          </div>
        </Field>
        <Field label="Temas prontos">
          <div className="flex flex-wrap gap-2">
            {ACCENT_NAMES.filter(isPresetTheme).map((name) => (
              <AccentChip key={name} active={settings.accent === name} label={ACCENTS[name].label} colors={DRACULA_SWATCH} onClick={() => void patch({ accent: name })} />
            ))}
          </div>
        </Field>
        <div className="flex flex-wrap items-center gap-6">
          <label className={cn('flex items-center gap-3', preset && 'opacity-50')}>
            <Switch checked={settings.tintBackground && !preset} disabled={preset} onCheckedChange={(v) => void patch({ tintBackground: v })} label="Tingir o fundo" />
            Tingir o fundo com a cor de destaque <span className="text-comment">{preset ? '(o tema pronto já define o fundo)' : '(desligado: preto e cinza neutros)'}</span>
          </label>
          <label className="flex items-center gap-3">
            <Switch checked={settings.showGrid} onCheckedChange={(v) => void patch({ showGrid: v })} label="Grid de fundo" />
            Grid de fundo
          </label>
        </div>
      </Section>

      <Section title="Dia a dia">
        <label className="flex items-center gap-3">
          <Switch checked={settings.notifications} onCheckedChange={(v) => void patch({ notifications: v })} label="Avisos do sistema" />
          Avisar no macOS quando a boiada subir, um passo falhar ou um serviço cair <span className="text-comment">(só com a janela fora de foco)</span>
        </label>
        <Field label="Terminal para abrir as pastas">
          <select className="pixel-input !w-48" value={settings.terminalApp} onChange={(e) => void patch({ terminalApp: e.target.value as TerminalApp })}>
            {TERMINAL_APPS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Processos">
        <Field label="SIGTERM → SIGKILL (ms)">
          <input type="number" min={500} max={60000} step={500} className="pixel-input w-32" value={settings.stopTimeoutMs} onChange={(e) => void patch({ stopTimeoutMs: Number(e.target.value) })} />
        </Field>
      </Section>

      <Section title="Conta GitHub">
        {auth?.user ? (
          <div className="flex items-center gap-3">
            <img src={auth.user.avatarUrl} alt="" className="h-8 w-8" />
            <span className="flex-1">@{auth.user.login} <span className="text-comment">({auth.source === 'gh-cli' ? 'importado do gh' : 'device flow'})</span></span>
            <PixelButton accent="red" onClick={async () => setAuth(await call('auth:logout'))}>Sair</PixelButton>
          </div>
        ) : (
          <p className="text-comment">Desconectado.</p>
        )}
      </Section>
    </div>
  )
}
