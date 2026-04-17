export const Z_INDEX_TOKENS = {
  base: 'var(--z-base)',
  content: 'var(--z-content)',
  overlay: 'var(--z-overlay)',
  floating: 'var(--z-floating)',
  loginMesh: 'var(--z-login-mesh)',
  loginDecor: 'var(--z-login-decor)',
  loginLayout: 'var(--z-login-layout)',
  loginVideo: 'var(--z-login-video)',
  loginContent: 'var(--z-login-content)',
  loginFloating: 'var(--z-login-floating)',
} as const;

export type ZIndexTokens = typeof Z_INDEX_TOKENS;
