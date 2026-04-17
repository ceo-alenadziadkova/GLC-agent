type AuthResult = { error: { message?: string } | null };

type AuthActions = {
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithPassword: (email: string, password: string) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  completePasswordRecovery: (password: string) => Promise<AuthResult>;
  signInWithGoogle: (options: { preserveGuestSession: boolean }) => Promise<AuthResult>;
};

export function createLoginAuthService(actions: AuthActions) {
  return {
    signIn(email: string, password: string) {
      return actions.signInWithPassword(email, password);
    },
    signUp(email: string, password: string) {
      return actions.signUpWithPassword(email, password);
    },
    requestReset(email: string) {
      return actions.requestPasswordReset(email);
    },
    completeRecovery(password: string) {
      return actions.completePasswordRecovery(password);
    },
    signInWithGoogle() {
      return actions.signInWithGoogle({ preserveGuestSession: false });
    },
  };
}
