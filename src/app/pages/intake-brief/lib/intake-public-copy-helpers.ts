/** Replace `{{key}}` placeholders in CMS-style copy strings. */
export function replaceIntakePublicCopyPlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(val);
  }
  return out;
}
