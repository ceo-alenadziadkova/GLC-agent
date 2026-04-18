export type AuthOperationErrorCode = 'reauth_required' | 'generic';

export function mapSupabaseAuthErrorCode(rawMessage: string | null | undefined): AuthOperationErrorCode {
  const normalizedMessage = (rawMessage ?? '').toLowerCase();
  if (
    normalizedMessage.includes('reauth') ||
    normalizedMessage.includes('recent') ||
    normalizedMessage.includes('session')
  ) {
    return 'reauth_required';
  }
  return 'generic';
}
