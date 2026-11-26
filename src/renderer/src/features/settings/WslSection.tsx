import type { Settings, WslStatus } from '@shared/types'
import { Badge } from '../../components/ui/Badge'
import { Field } from '../../components/ui/Field'
import { PixelButton } from '../../components/ui/PixelButton'
import { Spinner } from '../../components/ui/Spinner'

interface Props {
  status: WslStatus | null
  loading: boolean
  settings: Settings
  onDistro: (distro: string | null) => Promise<void>
  onRefresh: () => void
}

/**
 * Windows: os repositórios, comandos e serviços vivem numa distro WSL.
 * Mostra a distro em uso, deixa trocar e confere as ferramentas que o Berrante usa lá dentro.
 */
export function WslSection({ status, loading, settings, onDistro, onRefresh }: Props) {
  if (!status) return loading ? <Spinner label="verificando a WSL…" /> : null
  const missing = status.tools.filter((t) => !t.available)
  const defaultDistro = status.distros.find((d) => d.isDefault)?.name

  return (
    <div className="space-y-4">
      <p className="text-comment">
        No Windows, o Berrante trabalha dentro da WSL: os repositórios ficam na distro (ex.: <code>/home/voce/www</code>) e git,
        docker e os serviços rodam lá. No Explorer, a distro aparece em <code>\\wsl.localhost\{status.current ?? '<distro>'}</code>.
      </p>

      {status.error ? <p className="rounded border border-red/50 bg-red/10 px-3 py-2 text-red">{status.error}</p> : null}

      {status.installed ? (
        <Field label="Distro" hint={status.home ? `Pasta pessoal: ${status.home}` : undefined}>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="pixel-input w-64"
              value={settings.wslDistro ?? ''}
              onChange={(e) => void onDistro(e.target.value || null)}
            >
              <option value="">Padrão da WSL{defaultDistro ? ` (${defaultDistro})` : ''}</option>
              {status.distros.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                  {d.version === 1 ? ' · WSL 1' : ''}
                </option>
              ))}
            </select>
            {status.current ? <Badge tone="green">em uso: {status.current}</Badge> : null}
            <PixelButton size="sm" onClick={onRefresh} disabled={loading}>
              {loading ? 'Verificando…' : 'Verificar de novo'}
            </PixelButton>
          </div>
        </Field>
      ) : null}

      {status.distros.some((d) => d.name === status.current && d.version === 1) ? (
        <p className="text-orange">Essa distro está na WSL 1. Use a WSL 2 (`wsl --set-version {status.current} 2`) para o Docker e as portas funcionarem.</p>
      ) : null}

      {status.tools.length ? (
        <Field label="Ferramentas na distro">
          <div className="grid gap-1.5">
            {status.tools.map((t) => (
              <div key={t.name} className="flex items-center gap-3">
                <Badge tone={t.available ? 'green' : 'red'}>{t.available ? 'ok' : 'falta'}</Badge>
                <code className="w-16">{t.name}</code>
                {!t.available ? <span className="text-comment">{t.hint}</span> : null}
              </div>
            ))}
          </div>
          {missing.length ? <p className="mt-2 text-xs text-comment">Sem essas ferramentas, a parte correspondente (containers, portas, subir serviços) não funciona.</p> : null}
        </Field>
      ) : null}
    </div>
  )
}
