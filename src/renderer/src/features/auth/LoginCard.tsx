import { useEffect, useRef, useState } from 'react'
import type { DeviceFlowStart } from '@shared/types'
import { call, errorMessage } from '../../lib/api'
import { PixelBlock } from '../../components/ui/PixelBlock'
import { PixelButton } from '../../components/ui/PixelButton'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { useAppData } from '../layout/AppData'

/** Login: OAuth Device Flow (principal) ou importar o token do gh CLI (atalho). */
export function LoginCard() {
  const { auth, setAuth } = useAppData()
  const toast = useToast()
  const [flow, setFlow] = useState<DeviceFlowStart | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const poll = (interval: number) => {
    timer.current = setTimeout(async () => {
      try {
        const r = await call('auth:pollDeviceFlow')
        if (r.status === 'authorized') {
          setFlow(null)
          setAuth(await call('auth:status'))
          toast({ title: 'Porteira aberta!', body: `Logado como @${r.user.login}`, accent: 'green' })
        } else if (r.status === 'pending') poll(interval)
        else if (r.status === 'slow_down') poll(r.interval)
        else {
          setFlow(null)
          toast({ title: 'Login não concluído', body: r.status === 'expired' ? 'O código expirou.' : 'Acesso negado.', accent: 'red' })
        }
      } catch (err) {
        setFlow(null)
        toast({ title: 'Erro no login', body: errorMessage(err), accent: 'red' })
      }
    }, interval * 1000)
  }

  const startDevice = async () => {
    setBusy(true)
    try {
      const f = await call('auth:startDeviceFlow')
      setFlow(f)
      await call('auth:openVerificationUri')
      poll(f.interval)
    } catch (err) {
      toast({ title: 'Não deu para iniciar o login', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const importGh = async () => {
    setBusy(true)
    try {
      setAuth(await call('auth:importGhCli'))
      toast({ title: 'Sessão do gh importada', accent: 'green' })
    } catch (err) {
      toast({ title: 'Falha ao importar do gh', body: errorMessage(err), accent: 'red' })
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (timer.current) clearTimeout(timer.current)
    setFlow(null)
    await call('auth:cancelDeviceFlow')
  }

  return (
    <PixelBlock accent="accent" glow className="mx-auto max-w-xl p-6">
      <h2 className="title text-lg">Entrar com GitHub</h2>
      <p className="mt-2 text-comment">Para listar e clonar seus repositórios. O token fica cifrado no Keychain (safeStorage) e nunca vai para log.</p>
      {flow ? (
        <div className="mt-5 space-y-4">
          <p>Digite este código na página que abriu no navegador:</p>
          <div className="selectable rounded border border-line bg-darker py-4 text-center font-mono text-3xl font-bold tracking-[0.3em] text-accent">{flow.userCode}</div>
          <div className="flex items-center justify-between">
            <Spinner label="esperando a autorização…" />
            <div className="flex gap-2">
              <PixelButton onClick={() => void call('auth:openVerificationUri')}>Abrir de novo</PixelButton>
              <PixelButton onClick={() => void cancel()}>Cancelar</PixelButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-3">
          <PixelButton accent="accent" onClick={() => void startDevice()} disabled={busy || !auth?.deviceFlowAvailable} title={auth?.deviceFlowAvailable ? '' : 'Configure BERRANTE_GITHUB_CLIENT_ID em config/.env'}>
            Entrar (Device Flow)
          </PixelButton>
          <PixelButton accent="cyan" onClick={() => void importGh()} disabled={busy}>
            Importar sessão do gh
          </PixelButton>
        </div>
      )}
      {!auth?.deviceFlowAvailable ? <p className="mt-3 text-xs text-orange">Device Flow indisponível: falta o client_id em config/.env (veja o README).</p> : null}
    </PixelBlock>
  )
}
