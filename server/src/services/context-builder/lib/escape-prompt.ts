export function escapePromptContent(input: string): string {
  return input
    .replace(/<\/?system>/gi, '[filtered-system-tag]')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```/g, '` ` `')
    .replace(/\[\/?INST\]/gi, '[filtered-inst-tag]')
    .replace(/"(role|speaker)"\s*:\s*"(system|assistant|developer|tool)"/gi, '"$1":"filtered"')
    .replace(/\\"(role|speaker)\\"\s*:\s*\\"(system|assistant|developer|tool)\\"/gi, '\\"$1\\":\\"filtered\\"')
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '');
}
