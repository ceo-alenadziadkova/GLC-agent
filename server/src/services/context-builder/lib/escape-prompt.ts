export function escapePromptContent(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```/g, '` ` `')
    .replace(/<\/?system>/gi, '[filtered-system-tag]');
}
