export function canAccessAudit(audit: { user_id: string; client_id: string | null }, userId: string): boolean {
  return audit.user_id === userId || audit.client_id === userId;
}

export function assertClientRole(userRole: string | undefined): boolean {
  return userRole === 'client';
}
