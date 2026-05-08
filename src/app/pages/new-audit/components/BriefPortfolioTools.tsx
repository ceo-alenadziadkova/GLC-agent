import { useEffect, useMemo, useState } from 'react';
import { Spinner } from '@phosphor-icons/react';
import { WORKSPACE_PAGE_COPY } from '../../../config/workspace-page-copy';
import { api, ApiError } from '../../../data/apiService';
import { cn } from '../../../components/ui/utils';

const copyParent = WORKSPACE_PAGE_COPY.newAudit.step1.progressiveBrief;
const BRIEF_CLONE_SOURCE_EMPTY_CODE = 'AUDITS_BRIEF_CLONE_SOURCE_EMPTY';

function toCloneUiMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === BRIEF_CLONE_SOURCE_EMPTY_CODE) {
    return copyParent.cloneSourceEmpty;
  }
  if (error instanceof ApiError) {
    return error.message;
  }
  return copyParent.cloneError;
}

type BriefPortfolioToolsProps = {
  draftAuditId: string | null;
  briefCloneEnabled: boolean;
  /** Basics + Lighthouse early readout — before portrait questions are finished. */
  earlyIntelEligible: boolean;
  earlyIntelPending: boolean;
  onRunEarlyIntel: () => void | Promise<void>;
  onCloneApplied: (sourceAuditId: string) => Promise<void>;
};

export function BriefPortfolioTools({
  draftAuditId,
  briefCloneEnabled,
  earlyIntelEligible,
  earlyIntelPending,
  onRunEarlyIntel,
  onCloneApplied,
}: BriefPortfolioToolsProps) {
  const [open, setOpen] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidateRows, setCandidateRows] = useState<Array<{ id: string; company_name: string | null; company_url: string }>>(
    [],
  );
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [cloneBusy, setCloneBusy] = useState(false);
  const [cloneMessage, setCloneMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!open || draftAuditId == null || !briefCloneEnabled) return;
      setCandidatesLoading(true);
      setCloneMessage(null);
      try {
        const draft = await api.getAudit(draftAuditId);
        if (cancelled) return;
        const cid =
          typeof draft.meta?.client_id === 'string' || draft.meta?.client_id === null
            ? (draft.meta.client_id as string | null)
            : null;
        const list = await api.listAudits(80, 0);
        if (cancelled) return;
        const normCid = cid ?? '';
        const rows = list.data
          .filter(a => a.id !== draftAuditId && (a.client_id ?? '') === normCid)
          .map(a => ({
            id: a.id,
            company_name: a.company_name,
            company_url: a.company_url,
          }));
        setCandidateRows(rows);
        setSelectedSource('');
      } catch {
        if (!cancelled) {
          setCandidateRows([]);
          setCloneMessage(copyParent.cloneError);
        }
      } finally {
        if (!cancelled) setCandidatesLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [briefCloneEnabled, draftAuditId, open]);

  const earlyBlock = useMemo(() => {
    if (!earlyIntelEligible) return null;
    return (
      <div className="border-border/60 bg-muted/15 mb-3 rounded-lg border p-3">
        <p className="text-foreground m-0 text-sm font-medium">{copyParent.earlyIntelTitle}</p>
        <p className="text-muted-foreground mt-1 m-0 text-xs leading-relaxed">{copyParent.earlyIntelHint}</p>
        <button
          type="button"
          disabled={earlyIntelPending}
          onClick={() => {
            void onRunEarlyIntel();
          }}
          className={cn(
            'mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold sm:w-auto sm:px-4',
            'border border-border/80 bg-background text-foreground hover:bg-muted/40',
            earlyIntelPending && 'cursor-wait opacity-80',
          )}
        >
          {earlyIntelPending ? <Spinner className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {copyParent.earlyIntelCta}
        </button>
      </div>
    );
  }, [earlyIntelEligible, earlyIntelPending, onRunEarlyIntel]);

  if ((!briefCloneEnabled && !earlyIntelEligible) || draftAuditId == null) {
    return earlyBlock;
  }

  return (
    <div className="mb-3">
      {earlyBlock}
      {briefCloneEnabled ? (
        <details
          open={open}
          onToggle={e => {
            setOpen((e.target as HTMLDetailsElement).open);
          }}
          className="border-border/60 rounded-lg border bg-background/80"
        >
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-foreground">
            {copyParent.cloneToggle}
          </summary>
          <div className="border-border/50 border-t px-3 py-3 text-xs leading-relaxed">
            <p className="text-muted-foreground m-0">{copyParent.cloneDescription}</p>
            {candidatesLoading ? (
              <p className="text-muted-foreground mt-2 m-0 flex items-center gap-2">
                <Spinner className="h-4 w-4 animate-spin" aria-hidden />
                {copyParent.cloneLoadingAudits}
              </p>
            ) : candidateRows.length === 0 ? (
              <p className="text-muted-foreground mt-2 m-0">{copyParent.cloneNoCandidates}</p>
            ) : (
              <div className="mt-2 space-y-2">
                <label className="sr-only" htmlFor="brief-clone-source">
                  {copyParent.cloneOpen}
                </label>
                <select
                  id="brief-clone-source"
                  className="border-border bg-background text-foreground w-full rounded-lg border px-2 py-2 text-sm"
                  value={selectedSource}
                  onChange={e => setSelectedSource(e.target.value)}
                  disabled={cloneBusy}
                >
                  <option value="">{copyParent.cloneSelectPlaceholder}</option>
                  {candidateRows.map(r => (
                    <option key={r.id} value={r.id}>
                      {(r.company_name ?? r.company_url)?.trim() || r.id}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={cloneBusy || !selectedSource}
                  onClick={() => {
                    void (async () => {
                      setCloneBusy(true);
                      setCloneMessage(null);
                      try {
                        await onCloneApplied(selectedSource);
                        setCloneMessage(copyParent.cloneSuccess);
                      } catch (e) {
                        setCloneMessage(toCloneUiMessage(e));
                      } finally {
                        setCloneBusy(false);
                      }
                    })();
                  }}
                  className={cn(
                    'inline-flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold sm:w-auto sm:px-4',
                    'bg-[var(--gradient-brand-cta)] text-[var(--on-gradient-brand-fg)] shadow-[var(--shadow-brand-cta)]',
                    (cloneBusy || !selectedSource) && 'cursor-not-allowed opacity-70',
                  )}
                >
                  {cloneBusy ? <Spinner className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {cloneBusy ? copyParent.cloneApplying : copyParent.cloneApply}
                </button>
              </div>
            )}
            {cloneMessage ? <p className="text-muted-foreground mt-2 m-0">{cloneMessage}</p> : null}
          </div>
        </details>
      ) : (
        <p className="text-muted-foreground text-[length:var(--text-xs)]">{copyParent.cloneDisabledFlag}</p>
      )}
    </div>
  );
}
