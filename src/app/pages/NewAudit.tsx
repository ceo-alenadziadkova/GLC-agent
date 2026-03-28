import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, ArrowRight, MagnifyingGlass, HardDrives, Shield, Cursor, Target, Lightning, MapTrifold } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { SectionLabel } from '../components/glc/SectionLabel';
import { api } from '../data/apiService';

const INDUSTRIES = [
  'Hospitality', 'Real Estate', 'Marine', 'Healthcare',
  'Food & Beverage', 'Retail', 'Professional Services', 'Other',
];

const DOMAIN_PILLS = [
  { icon: MagnifyingGlass, label: 'Recon',      color: 'var(--glc-blue)'      },
  { icon: HardDrives,      label: 'Tech',        color: '#8B5CF6'              },
  { icon: Shield,          label: 'Security',    color: 'var(--score-1)'      },
  { icon: Globe,           label: 'SEO',         color: 'var(--glc-green)'    },
  { icon: Cursor,          label: 'UX',          color: 'var(--score-3)'      },
  { icon: Target,          label: 'Marketing',   color: 'var(--glc-orange)'   },
  { icon: Lightning,       label: 'Automation',  color: 'var(--glc-blue-dark)'},
  { icon: MapTrifold,      label: 'Strategy',    color: 'var(--glc-green-dark)'},
];

export function NewAudit() {
  const navigate   = useNavigate();
  const [url,      setUrl]      = useState('');
  const [name,     setName]     = useState('');
  const [industry, setIndustry] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  function isValidUrl(raw: string): boolean {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    try {
      const prefixed = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      const parsed = new URL(prefixed);
      return parsed.hostname.includes('.');
    } catch {
      return false;
    }
  }
  const canSubmit = isValidUrl(url);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.createAudit(url, name || undefined, industry || undefined);
      navigate(`/pipeline/${result.id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <AppShell title="New Audit" subtitle="Start a comprehensive 8-domain business analysis">
      <div
        className="min-h-full flex flex-col items-center justify-center py-12 px-6 relative"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        {/* Mesh glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'var(--mesh-brand)', opacity: 0.55 }}
        />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full"
          style={{ maxWidth: 460 }}
        >
          {/* Icon + title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: 'var(--gradient-brand)',
                boxShadow: '0 8px 28px rgba(28,189,255,0.32), 0 2px 8px rgba(0,0,0,0.14)',
              }}
            >
              <Globe className="w-7 h-7 text-white" />
            </motion.div>

            <SectionLabel accent>GLStech Audit Platform</SectionLabel>

            <h1
              className="mt-2"
              style={{
                fontSize: 'var(--text-3xl)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                letterSpacing: 'var(--tracking-tight)',
                lineHeight: 1.15,
              }}
            >
              Start a New Audit
            </h1>
            <p className="mt-2.5" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Enter the company website and we'll analyze{' '}
              <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>8 business domains</strong>{' '}
              automatically.
            </p>
          </div>

          {/* Domain pills */}
          <motion.div
            className="flex flex-wrap gap-1.5 justify-center mb-7"
            initial="hidden"
            animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.045 } } }}
          >
            {DOMAIN_PILLS.map(({ icon: I, label, color }) => (
              <motion.span
                key={label}
                variants={{
                  hidden:  { opacity: 0, scale: 0.85, y: 4 },
                  visible: { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <I className="w-3 h-3 flex-shrink-0" style={{ color }} />
                {label}
              </motion.span>
            ))}
          </motion.div>

          {/* Card form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="glc-card p-6 space-y-5"
            style={{
              borderRadius: 'var(--radius-2xl)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* URL */}
            <div className="space-y-1.5">
              <label
                htmlFor="url"
                className="block font-medium"
                style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}
              >
                Company Website <span style={{ color: 'var(--glc-orange)' }}>*</span>
              </label>
              <div
                className="flex items-center overflow-hidden"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: url ? '1px solid var(--glc-blue)' : '1px solid var(--border-default)',
                  boxShadow: url ? 'var(--shadow-blue)' : 'none',
                  backgroundColor: 'var(--bg-surface)',
                  transition: 'border-color var(--ease-fast), box-shadow var(--ease-fast)',
                }}
              >
                <div
                  className="flex items-center justify-center px-3 self-stretch flex-shrink-0"
                  style={{ borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-inset)', minWidth: 44 }}
                >
                  <Globe className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://company.com"
                  required
                  autoFocus
                  className="flex-1 px-4 py-3 bg-transparent outline-none"
                  style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}
                />
              </div>
            </div>

            {/* Company name */}
            <div className="space-y-1.5">
              <label htmlFor="cname" className="flex items-center gap-2 font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                Company Name
                <span className="font-normal" style={{ color: 'var(--text-quaternary)', fontSize: '11px' }}>optional</span>
              </label>
              <input
                id="cname"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Hotel XYZ"
                className="w-full px-4 py-3 bg-transparent outline-none"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                  transition: 'border-color var(--ease-fast), box-shadow var(--ease-fast)',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--glc-blue)'; e.target.style.boxShadow = 'var(--shadow-blue)'; }}
                onBlur={e =>  { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Industry */}
            <div className="space-y-1.5">
              <label htmlFor="industry" className="flex items-center gap-2 font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                Industry
                <span className="font-normal" style={{ color: 'var(--text-quaternary)', fontSize: '11px' }}>tailors recommendations</span>
              </label>
              <select
                id="industry"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full px-4 py-3 outline-none appearance-none"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: industry ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  fontSize: 'var(--text-sm)',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238496B0' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  transition: 'border-color var(--ease-fast), box-shadow var(--ease-fast)',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--glc-blue)'; e.target.style.boxShadow = 'var(--shadow-blue)'; }}
                onBlur={e =>  { e.target.style.borderColor = 'var(--border-default)'; e.target.style.boxShadow = 'none'; }}
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            {/* Gradient divider */}
            <div className="glc-divider" />

            {/* CTA */}
            <motion.button
              type="submit"
              disabled={!canSubmit || loading}
              whileHover={canSubmit && !loading ? { scale: 1.015, boxShadow: '0 6px 20px rgba(242,79,29,0.36)' } : {}}
              whileTap={canSubmit  && !loading ? { scale: 0.985 } : {}}
              className="w-full flex items-center justify-center gap-2 py-3 text-white font-semibold"
              style={{
                borderRadius: 'var(--radius-lg)',
                background: canSubmit ? 'var(--gradient-accent)' : 'var(--border-default)',
                cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
                fontSize: 'var(--text-sm)',
                letterSpacing: '-0.01em',
                border: 'none',
                boxShadow: canSubmit ? '0 4px 14px rgba(242,79,29,0.28)' : 'none',
                transition: 'opacity var(--ease-fast), background var(--ease-fast)',
              }}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Starting pipeline...
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    Start Audit <ArrowRight className="w-4 h-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {error && (
              <p className="text-center text-sm" style={{ color: 'var(--score-1)' }}>{error}</p>
            )}

            <p className="text-center" style={{ fontSize: '11px', color: 'var(--text-quaternary)', lineHeight: 1.5 }}>
              We collect only publicly available information.
              <br />No credentials or account access required.
            </p>
          </motion.form>
        </motion.div>
      </div>
    </AppShell>
  );
}
