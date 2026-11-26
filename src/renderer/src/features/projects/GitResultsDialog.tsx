import type { RepoGitResult } from '@shared/types'
import { cn } from '../../lib/cn'
import { Dialog } from '../../components/ui/Dialog'
import { PixelButton } from '../../components/ui/PixelButton'

const ICON: Record<RepoGitResult['status'], string> = { ok: '✓', skipped: '–', failed: '✕' }
const COLOR: Record<RepoGitResult['status'], string> = { ok: 'text-green', skipped: 'text-comment', failed: 'text-red' }

/** Resultado repo a repo de um pull ou troca de branch na tropa toda. */
export function GitResultsDialog({ title, results, onClose }: { title: string; results: RepoGitResult[] | null; onClose: () => void }) {
  const failed = results?.some((r) => r.status === 'failed')
  return (
    <Dialog open={results !== null} onOpenChange={(o) => !o && onClose()} title={title} accent={failed ? 'orange' : 'green'}>
      <div className="space-y-2">
        {results?.map((r) => (
          <div key={r.repoId} className="flex items-start gap-3 rounded border border-line bg-darker px-3 py-2 font-mono text-xs">
            <span className={cn('font-bold', COLOR[r.status])}>{ICON[r.status]}</span>
            <span className="shrink-0 font-bold text-fg">{r.repoName}</span>
            <span className="selectable min-w-0 break-words text-comment">{r.message}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <PixelButton onClick={onClose}>Fechar</PixelButton>
      </div>
    </Dialog>
  )
}
