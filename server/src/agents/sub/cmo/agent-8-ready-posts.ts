import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CmoReadyPostsOutputSchema } from '../../../schemas/sub-agents/cmo/ready-posts.js';

export class CmoAgent8ReadyPosts extends DirectorSubAgentBase {
  readonly id = 'cmo.agent_8_ready_posts' as const;
  readonly directorDomain = 'marketing_utp' as const;
  readonly promptRef = 'server/prompts/sub-agents/cmo/agent-8-ready-posts.md';
  readonly outputSchema = CmoReadyPostsOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cmo/agent-8-ready-posts');
  }
}
