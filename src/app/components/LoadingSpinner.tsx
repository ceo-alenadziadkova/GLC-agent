import { motion } from 'motion/react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <motion.div
          className="w-12 h-12 border-4 rounded-full mx-auto mb-4"
          style={{
            borderColor: 'var(--panel-border)',
            borderTopColor: 'var(--text-primary)'
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading audit report...
        </p>
      </div>
    </div>
  );
}
