/**
 * Agent runtime entrypoint — re-exports preserve imports from `../agents/base.js`.
 */

export { BaseAgent } from './base/base-agent.js';
export { loadPrompt, promptVersion } from './base/prompt-loader.js';
