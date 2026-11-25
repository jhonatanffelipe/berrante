import { useState } from 'react'
import type { AiCliName, AiCliStatus, TotpSetup, TotpStatus } from '@shared/types'
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
import { useTotp } from '../security/TotpProvider'

function Section({ title, children, accent = 'line' as const }: { title: string; children: React.ReactNode; accent?: 'line' | 'purple' | 'yellow' | 'red' | 'cyan' }) {
  return (
    <PixelBlock accent={accent} className="space-y-4 p-5">
      <h3 className="font-pixel text-pixel text-fg">{title}</h3>
      {children}
    </PixelBlock>
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
    <Section title="Autenticação em dois fatores (TOTP)" accent="yellow">
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
              <input className="pixel-input text-center font-terminal !text-2xl tracking-[0.4em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} maxLength={6} autoFocus />
            </Field>
            <div className="flex justify-end gap-2">
              <PixelButton onClick={() => setSetup(null)}>Cancelar</PixelButton>
              <PixelButton accent="yellow" disabled={code.length !== 6} onClick={() => void confirm()}>Ativar</PixelButton>
            </div>
          </div>
        ) : null}
      </Dialog>

      <Dialog open={codes !== null} onOpenChange={(o) => !o && setCodes(null)} title="Códigos de recuperação" description="Guarde agora (ex: no 1Password). Cada um vale uma vez e eles não serão mostrados de novo." accent="yellow">
        <div className="selectable grid grid-cols-2 gap-2 bg-darker p-4 font-terminal text-2xl text-yellow">
          {codes?.map((c) => <span key={c}>{c}</span>)}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <PixelButton onClick={() => void navigator.clipboard.writeText(codes?.join('\n') ?? '')}>Copiar</PixelButton>
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
      <h2 className="font-pixel text-pixel-lg text-yellow">Configurações</h2>

      <Section title="Pasta raiz dos clones">
        <div className="flex items-center gap-3">
          <code className="selectable flex-1 bg-darker px-3 py-2">{shortPath(settings.cloneRoot)}</code>
          <PixelButton onClick={async () => setSettings(await call('settings:pickCloneRoot'))}>Escolher…</PixelButton>
        </div>
      </Section>

      <Section title="IA (fallback de detecção)" accent="purple">
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

      <Section title="Aparência e processos" accent="cyan">
        <div className="flex flex-wrap items-center gap-6">
          <Field label="Tema">
            <select className="pixel-input w-48" value={settings.theme} onChange={(e) => void patch({ theme: e.target.value as 'dracula' | 'alucard' })}>
              <option value="dracula">Dracula (escuro)</option>
              <option value="alucard">Alucard (claro)</option>
            </select>
          </Field>
          <label className="flex items-center gap-3">
            <Switch checked={settings.showGrid} onCheckedChange={(v) => void patch({ showGrid: v })} label="Grid de fundo" />
            Grid de fundo
          </label>
          <Field label="SIGTERM → SIGKILL (ms)">
            <input type="number" min={500} max={60000} step={500} className="pixel-input w-32" value={settings.stopTimeoutMs} onChange={(e) => void patch({ stopTimeoutMs: Number(e.target.value) })} />
          </Field>
        </div>
      </Section>

      <Section title="Conta GitHub" accent="red">
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
