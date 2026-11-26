import { useState } from 'react'
import type { PlanProfile, ServiceDefinition } from '@shared/types'
import { cn } from '../../lib/cn'
import { accentBg } from '../../lib/accent'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelButton } from '../../components/ui/PixelButton'

interface Props {
  profiles: PlanProfile[]
  steps: ServiceDefinition[]
  onChange: (profiles: PlanProfile[]) => void
}

/**
 * Perfis da tropa: subconjuntos de passos para tocar (ex.: "só a API").
 * Um perfil novo nasce com os passos habilitados agora; depois é só marcar e desmarcar.
 */
export function ProfilesEditor({ profiles, steps, onChange }: Props) {
  const [name, setName] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const open = profiles.find((p) => p.id === openId) ?? null
  const taken = profiles.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())

  const add = () => {
    const trimmed = name.trim()
    if (!trimmed || taken) return
    const profile: PlanProfile = { id: `profile:${crypto.randomUUID().slice(0, 8)}`, name: trimmed, serviceIds: steps.filter((s) => s.enabled).map((s) => s.id) }
    onChange([...profiles, profile])
    setName('')
    setOpenId(profile.id)
  }

  const toggle = (profile: PlanProfile, stepId: string) => {
    const has = profile.serviceIds.includes(stepId)
    const serviceIds = has ? profile.serviceIds.filter((id) => id !== stepId) : [...profile.serviceIds, stepId]
    onChange(profiles.map((p) => (p.id === profile.id ? { ...p, serviceIds } : p)))
  }

  return (
    <PixelBlock className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="label mr-2">Perfis</h3>
        {profiles.map((p) => (
          <span key={p.id} className={cn('flex items-center rounded border font-mono text-[11px]', openId === p.id ? 'border-accent bg-accent/10' : 'border-line')}>
            <button type="button" className="px-2 py-1 text-fg" onClick={() => setOpenId(openId === p.id ? null : p.id)}>
              {p.name} <span className="text-comment">({p.serviceIds.length})</span>
            </button>
            <button type="button" className="border-l border-line px-1.5 py-1 text-red" aria-label={`Apagar perfil ${p.name}`} onClick={() => onChange(profiles.filter((x) => x.id !== p.id))}>
              ✕
            </button>
          </span>
        ))}
        <input
          className="pixel-input !w-48 !py-1 text-xs"
          placeholder="nome, ex.: só a API"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          aria-label="Nome do novo perfil"
        />
        <PixelButton size="sm" disabled={!name.trim() || taken || profiles.length >= 20} onClick={add}>
          + Perfil com os passos ligados
        </PixelButton>
      </div>
      {!profiles.length ? (
        <p className="text-xs text-comment">Sem perfis: o berrante toca todos os passos ligados. Crie um perfil para subir só parte da tropa (escolha no cabeçalho da tropa).</p>
      ) : null}
      {open ? (
        <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
          {steps.map((s) => (
            <label key={s.id} className={cn('flex items-center gap-2 rounded border border-line px-2 py-1.5 text-xs', !s.enabled && 'opacity-50')}>
              <input type="checkbox" checked={open.serviceIds.includes(s.id)} onChange={() => toggle(open, s.id)} />
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-[1px]', accentBg[s.color])} />
              <span className="truncate">{s.name}</span>
              {!s.enabled ? <span className="text-comment">(desligado no plano)</span> : null}
            </label>
          ))}
        </div>
      ) : null}
    </PixelBlock>
  )
}
