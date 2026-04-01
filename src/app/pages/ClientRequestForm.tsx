import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Globe, Buildings, ArrowRight, Warning, CheckCircle, Spinner,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { api } from '../data/apiService';
import { INDUSTRY_OPTIONS } from '../data/industry-options';

function isValidPublicUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const prefixed = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    return new URL(prefixed).hostname.includes('.');
  } catch {
    return false;
  }
}

export function ClientRequestForm() {
  const navigate = useNavigate();

  const [url, setUrl] = useState('');
  const [noPublicWebsite, setNoPublicWebsite] = useState(false);
  const [industry, setIndustry] = useState('');
  const [industrySpecify, setIndustrySpecify] = useState('');
  const [productMode, setProductMode] = useState<'express' | 'full'>('express');
  const [clientNotes, setClientNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!noPublicWebsite && !isValidPublicUrl(url)) {
      setError('Enter a valid website URL, or check the box if you have no public website.');
      return;
    }

    if (industry === 'Other' && !industrySpecify.trim()) {
      setError('Please describe your industry or sector when you select Other.');
      return;
    }

    setSubmitting(true);
    try {
      const brief_snapshot: Record<string, unknown> = {};
      if (industry === 'Other' && industrySpecify.trim()) {
        brief_snapshot.intake_industry_specify = industrySpecify.trim();
      }

      const req = await api.createAuditRequest({
        url: noPublicWebsite ? '' : url.trim(),
        no_public_website: noPublicWebsite,
        industry: industry || undefined,
        product_mode: productMode,
        brief_snapshot: Object.keys(brief_snapshot).length ? brief_snapshot : undefined,
        client_notes: clientNotes.trim() || undefined,
      });

      await api.submitAuditRequest(req.id);

      navigate('/portal');
    } catch (err) {
      setError((err as Error).message ?? 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="New Audit Request" subtitle="We'll review your request within 24 hours">
      <div className="px-7 py-6 max-w-xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* URL */}
          <div className="space-y-1.5">
            <label
              htmlFor="url"
              className="block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Website URL
              {!noPublicWebsite ? (
                <span style={{ color: '#EF4444' }}> *</span>
              ) : (
                <span className="font-normal" style={{ color: 'var(--text-quaternary)', fontSize: '11px', marginLeft: 6 }}>
                  optional if no site
                </span>
              )}
            </label>
            <div className="relative">
              <Globe
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                id="url"
                type="text"
                value={url}
                onChange={e => {
                  setNoPublicWebsite(false);
                  setUrl(e.target.value);
                }}
                placeholder="https://yourcompany.com"
                disabled={noPublicWebsite}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--glc-blue)'; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={noPublicWebsite}
                onChange={e => {
                  const on = e.target.checked;
                  setNoPublicWebsite(on);
                  if (on) setUrl('');
                }}
                className="rounded border-[var(--border-default)]"
                style={{ accentColor: 'var(--glc-blue)' }}
              />
              I don&apos;t have a public website yet
            </label>
          </div>

          {/* Industry */}
          <div className="space-y-1.5">
            <label
              htmlFor="industry"
              className="block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Industry
            </label>
            <div className="relative">
              <Buildings
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <select
                id="industry"
                value={industry}
                onChange={e => {
                  const v = e.target.value;
                  setIndustry(v);
                  if (v !== 'Other') setIndustrySpecify('');
                }}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none appearance-none"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: industry ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
                onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--glc-blue)'; }}
                onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
              >
                <option value="">Select industry (optional)</option>
                {INDUSTRY_OPTIONS.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            {industry === 'Other' && (
              <div className="space-y-1 pt-1">
                <label htmlFor="industry-specify" className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Which industry or sector? <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="industry-specify"
                  type="text"
                  value={industrySpecify}
                  onChange={e => setIndustrySpecify(e.target.value)}
                  placeholder="e.g. niche manufacturing, creator economy"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--glc-blue)'; }}
                  onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
                />
              </div>
            )}
          </div>

          {/* Product mode */}
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Audit Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['express', 'full'] as const).map(mode => {
                const selected = productMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setProductMode(mode)}
                    className="relative rounded-xl px-4 py-3.5 text-left transition-all"
                    style={{
                      backgroundColor: selected ? 'rgba(28,189,255,0.08)' : 'var(--bg-surface)',
                      border: selected ? '1px solid rgba(28,189,255,0.30)' : '1px solid var(--border-subtle)',
                    }}
                  >
                    {selected && (
                      <CheckCircle
                        weight="fill"
                        className="absolute top-2.5 right-2.5 w-3.5 h-3.5"
                        style={{ color: 'var(--glc-blue)' }}
                      />
                    )}
                    <div
                      className="text-sm font-semibold mb-0.5"
                      style={{ color: selected ? 'var(--glc-blue-deeper)' : 'var(--text-primary)' }}
                    >
                      {mode === 'express' ? 'Express' : 'Full Audit'}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {mode === 'express'
                        ? '4–6 key domains, 48h turnaround'
                        : 'All 6 domains + strategy, 5–7 days'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="notes"
              className="block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Additional notes
            </label>
            <textarea
              id="notes"
              value={clientNotes}
              onChange={e => setClientNotes(e.target.value)}
              rows={4}
              placeholder="Any context about your business goals, known pain points, competitors, or priorities..."
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--glc-blue)'; }}
              onBlur={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
            />
          </div>

          {error && (
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}
            >
              <Warning className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: submitting ? 'var(--bg-muted)' : 'var(--gradient-brand)',
              color: submitting ? 'var(--text-secondary)' : 'var(--glc-ink)',
              border: submitting ? '1px solid var(--border-subtle)' : 'none',
              boxShadow: submitting ? 'none' : 'var(--glow-blue-sm)',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting
              ? <><Spinner className="w-4 h-4 animate-spin" /> Submitting...</>
              : <><ArrowRight className="w-4 h-4" /> Submit Request</>}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
