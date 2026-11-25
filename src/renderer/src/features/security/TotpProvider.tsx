import { createContext, useCallback, useContext, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { BerranteError, errorMessage } from '../../lib/api'
import { Dialog } from '../../components/ui/Dialog'
import { PixelButton } from '../../components/ui/PixelButton'
import { Field } from '../../components/ui/Field'

type WithTotp = <T>(reason: string, fn: (code?: string) => Promise<T>) => Promise<T | null>

const Ctx = createContext<WithTotp>(async (_r, fn) => fn())
export const useTotp = () => useContext(Ctx)

/**
 * Executa a ação; se o main pedir 2FA (TOTP_REQUIRED/INVALID), abre o prompt e repete com o código.
 * Retorna null se o usuário cancelar.
 */
export function TotpProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ reason: string; error: string | null } | null>(null)
  const [code, setCode] = useState('')
  const resolver = useRef<((code: string | null) => void) | null>(null)

  const ask = (reason: string, error: string | null) =>
    new Promise<string | null>((resolve) => {
      resolver.current = resolve
      setCode('')
      setState({ reason, error })
    })

  const withTotp: WithTotp = useCallback(async (reason, fn) => {
    let codeToUse: string | undefined
    for (;;) {
      try {
        const result = await fn(codeToUse)
        setState(null)
        return result
      } catch (err) {
        if (err instanceof BerranteError && (err.code === 'TOTP_REQUIRED' || (err.code === 'TOTP_INVALID' && codeToUse))) {
          const next = await ask(reason, err.code === 'TOTP_INVALID' ? errorMessage(err) : null)
          if (!next) return null
          codeToUse = next
          continue
        }
        setState(null)
        throw err
      }
    }
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    resolver.current?.(code.trim())
  }
  const cancel = () => {
    resolver.current?.(null)
    setState(null)
  }

  return (
    <Ctx.Provider value={withTotp}>
      {children}
      <Dialog open={state !== null} onOpenChange={(o) => !o && cancel()} title="Código 2FA" description={state?.reason} accent="yellow" width="max-w-sm">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Autenticador ou código de recuperação" hint="6 dígitos do app, ou um código xxxxx-xxxxx">
            <input autoFocus className="pixel-input text-center font-terminal !text-2xl tracking-[0.4em]" value={code} onChange={(e) => setCode(e.target.value)} maxLength={11} autoComplete="one-time-code" />
          </Field>
          {state?.error ? <p className="text-red">{state.error}</p> : null}
          <div className="flex justify-end gap-2">
            <PixelButton onClick={cancel}>Cancelar</PixelButton>
            <PixelButton type="submit" accent="yellow" disabled={code.trim().length < 6}>
              Confirmar
            </PixelButton>
          </div>
        </form>
      </Dialog>
    </Ctx.Provider>
  )
}
