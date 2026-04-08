import { useMemo, useState } from 'react';
import { TreeStructure } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import type { IntakeBriefCollectionMode, ProductMode } from '../data/auditTypes';
import { buildIntakePlan } from '../../../server/src/intake/core/build-intake-plan';
import { formatPlanTrace } from '../../../server/src/intake/core/format-trace';
import type { IntakeSurface } from '../../../server/src/intake/core/types';

const PRODUCT_OPTIONS: { value: ProductMode; label: string }[] = [
  { value: 'full', label: 'full' },
  { value: 'express', label: 'express' },
  { value: 'free_snapshot', label: 'free_snapshot' },
];

const COLLECTION_OPTIONS: { value: IntakeBriefCollectionMode | ''; label: string }[] = [
  { value: '', label: '(omit)' },
  { value: 'self_serve', label: 'self_serve' },
  { value: 'interview', label: 'interview' },
  { value: 'pre_brief', label: 'pre_brief' },
  { value: 'discovery', label: 'discovery' },
];

const SURFACE_OPTIONS: { value: IntakeSurface | ''; label: string }[] = [
  { value: '', label: '(omit)' },
  { value: 'consultant_interview', label: 'consultant_interview' },
  { value: 'client_form', label: 'client_form' },
  { value: 'client_portal', label: 'client_portal' },
  { value: 'internal_review', label: 'internal_review' },
  { value: 'public_discovery', label: 'public_discovery' },
];

const DEFAULT_RESPONSES = '{\n  "a2": "hospitality",\n  "a5": "no_website"\n}\n';

export function IntakeTraceTool() {
  const [productMode, setProductMode] = useState<ProductMode>('full');
  const [collectionMode, setCollectionMode] = useState<IntakeBriefCollectionMode | ''>('');
  const [surface, setSurface] = useState<IntakeSurface | ''>('');
  const [responsesText, setResponsesText] = useState(DEFAULT_RESPONSES);

  const trace = useMemo(() => {
    let responses: Record<string, unknown>;
    try {
      responses = JSON.parse(responsesText) as Record<string, unknown>;
      if (responses === null || typeof responses !== 'object' || Array.isArray(responses)) {
        return { ok: false as const, message: 'Responses must be a JSON object.' };
      }
    } catch {
      return { ok: false as const, message: 'Invalid JSON in responses.' };
    }
    try {
      const plan = buildIntakePlan({
        responses,
        productMode,
        collectionMode: collectionMode || undefined,
        surface: surface || undefined,
      });
      const text = formatPlanTrace(plan, {
        productMode,
        collectionMode: collectionMode || undefined,
        surface: surface || undefined,
      });
      return { ok: true as const, text };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false as const, message: msg };
    }
  }, [responsesText, productMode, collectionMode, surface]);

  const displayError = trace.ok ? null : trace.message;
  const displayText = trace.ok ? trace.text : '';

  return (
    <AppShell
      title="Intake plan trace"
      subtitle="Runs buildIntakePlan locally — same resolver as the server CLI (debug only)"
      actions={(
        <TreeStructure className="w-6 h-6 text-[var(--glc-muted)]" aria-hidden />
      )}
    >
      <div className="glc-page-content max-w-5xl mx-auto space-y-4">
        <p className="text-sm text-[var(--glc-muted)]">
          Consultant-only tool. Paste responses as JSON; choose product mode, optional collection mode and surface
          (use discovery + public_discovery to exercise layout).
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Product mode</span>
            <select
              className="glc-input"
              value={productMode}
              onChange={e => setProductMode(e.target.value as ProductMode)}
            >
              {PRODUCT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Collection mode</span>
            <select
              className="glc-input"
              value={collectionMode}
              onChange={e => setCollectionMode(e.target.value as IntakeBriefCollectionMode | '')}
            >
              {COLLECTION_OPTIONS.map(o => (
                <option key={o.value || 'omit'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Surface</span>
            <select
              className="glc-input"
              value={surface}
              onChange={e => setSurface(e.target.value as IntakeSurface | '')}
            >
              {SURFACE_OPTIONS.map(o => (
                <option key={o.value || 'omit'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Responses (JSON object)</span>
          <textarea
            className="glc-input font-mono text-xs min-h-[140px]"
            value={responsesText}
            onChange={e => setResponsesText(e.target.value)}
            spellCheck={false}
          />
        </label>
        {displayError && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {displayError}
          </div>
        )}
        <pre className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto min-h-[200px]">
          {displayText || (displayError ? '' : 'Adjust inputs to refresh trace.')}
        </pre>
      </div>
    </AppShell>
  );
}
