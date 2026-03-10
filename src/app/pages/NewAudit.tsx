import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Globe, ArrowRight, Search, Server, Shield, MousePointer, Target, Zap, Map } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { SectionLabel } from '../components/glc/SectionLabel';

const INDUSTRIES = [
  'Hospitality', 'Real Estate', 'Marine', 'Healthcare',
  'Food & Beverage', 'Retail', 'Professional Services', 'Other',
];

const DOMAIN_PILLS = [
  { icon: Search,      label: 'Recon'          },
  { icon: Server,      label: 'Tech'           },
  { icon: Shield,      label: 'Security'       },
  { icon: Globe,       label: 'SEO'            },
  { icon: MousePointer,label: 'UX'             },
  { icon: Target,      label: 'Marketing'      },
  { icon: Zap,         label: 'Automation'     },
  { icon: Map,         label: 'Strategy'       },
];

export function NewAudit() {
  const navigate = useNavigate();
  const [url, setUrl]           = useState('');
  const [name, setName]         = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading]   = useState(false);

  const canSubmit = url.trim().length > 4;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    // Simulate kick-off delay → navigate to Pipeline
    setTimeout(() => navigate('/pipeline'), 800);
  }

  return (
    <AppShell
      title="New Audit"
      subtitle="Start a comprehensive 8-domain business analysis"
    >
      <div
        className="flex flex-col items-center justify-center min-h-full py-12 px-6"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full"
          style={{ maxWidth: 480 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'linear-gradient(135deg, var(--glc-blue) 0%, var(--glc-blue-dark) 100%)',
              }}
            >
              <Globe className="w-6 h-6 text-white" />
            </div>
            <SectionLabel>New Audit</SectionLabel>
            <h1
              className="mt-2 font-bold"
              style={{
                fontSize: 'var(--text-3xl)',
                color: 'var(--text-primary)',
                letterSpacing: 'var(--tracking-tight)',
              }}
            >
              Start a New Audit
            </h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Enter the company website and we'll analyze&nbsp;
              <strong style={{ color: 'var(--text-primary)' }}>8 domains</strong> of the business.
            </p>
          </div>

          {/* Domain pills */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {DOMAIN_PILLS.map(({ icon: I, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <I className="w-3 h-3" style={{ color: 'var(--glc-blue)' }} />
                {label}
              </span>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="glc-card p-6 space-y-5">

            {/* URL field */}
            <div className="space-y-1.5">
              <label
                htmlFor="url"
                className="block text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Company Website <span style={{ color: 'var(--glc-orange)' }}>*</span>
              </label>
              <div
                className="flex items-center rounded-lg overflow-hidden transition-shadow"
                style={{
                  border: url ? '1px solid var(--glc-blue)' : '1px solid var(--border-default)',
                  boxShadow: url ? 'var(--shadow-blue)' : 'none',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                <div
                  className="flex items-center justify-center px-3 self-stretch"
                  style={{ borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-muted)' }}
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
                  className="flex-1 px-4 py-3 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* Company name */}
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="block text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Company Name
                <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                  optional — detected automatically if empty
                </span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Hotel XYZ"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow"
                style={{
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
                onFocus={e => {
                  (e.target as HTMLInputElement).style.borderColor = 'var(--glc-blue)';
                  (e.target as HTMLInputElement).style.boxShadow = 'var(--shadow-blue)';
                }}
                onBlur={e => {
                  (e.target as HTMLInputElement).style.borderColor = 'var(--border-default)';
                  (e.target as HTMLInputElement).style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Industry */}
            <div className="space-y-1.5">
              <label
                htmlFor="industry"
                className="block text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Industry
                <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
                  optional — helps tailor recommendations
                </span>
              </label>
              <select
                id="industry"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow appearance-none"
                style={{
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: industry ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
                onFocus={e => {
                  (e.target as HTMLSelectElement).style.borderColor = 'var(--glc-blue)';
                  (e.target as HTMLSelectElement).style.boxShadow = 'var(--shadow-blue)';
                }}
                onBlur={e => {
                  (e.target as HTMLSelectElement).style.borderColor = 'var(--border-default)';
                  (e.target as HTMLSelectElement).style.boxShadow = 'none';
                }}
              >
                <option value="">Select industry...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: 'var(--border-subtle)' }} />

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={!canSubmit || loading}
              whileHover={canSubmit && !loading ? { scale: 1.01 } : {}}
              whileTap={canSubmit && !loading ? { scale: 0.99 } : {}}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{
                backgroundColor: canSubmit ? 'var(--glc-orange)' : 'var(--border-default)',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
              }}
            >
              {loading ? (
                <>
                  <span
                    className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                  />
                  Starting pipeline...
                </>
              ) : (
                <>
                  Start Audit
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>

            <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
              We'll start by collecting public data about the company.
              <br />
              No account access or credentials required.
            </p>
          </form>
        </motion.div>
      </div>
    </AppShell>
  );
}
