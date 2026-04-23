import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIRECTOR_CROSS_DOMAIN_DEPENDENCY_ALLOWLIST, DIRECTOR_SUB_AGENTS } from '../config/director-sub-agents.js';

describe('director sub-agent registry consistency', () => {
  it('has existing prompt files with source-of-truth header and matching agent references', () => {
    const cmoInstructionsPath = resolve(process.cwd(), '../docs/instructions/CMO-INSTRUCTIONS.md');
    const cmoInstructions = readFileSync(cmoInstructionsPath, 'utf8');
    for (const agent of DIRECTOR_SUB_AGENTS) {
      const fromServerCwd = resolve(process.cwd(), agent.prompt_ref);
      const fromRepoRoot = resolve(process.cwd(), '..', agent.prompt_ref);
      const absolute = existsSync(fromServerCwd) ? fromServerCwd : fromRepoRoot;
      expect(existsSync(absolute)).toBe(true);
      const content = readFileSync(absolute, 'utf8');
      expect(content).toContain('<!-- anti-drift:');
      expect(content).toContain('<!-- version:');
      expect(content).toContain('Source of truth: docs/instructions/');
      expect(content).toContain('Invariant:');
      if (agent.id.startsWith('cmo.')) {
        expect(content).toContain('docs/instructions/CMO-INSTRUCTIONS.md');
        expect(cmoInstructions).toContain(`AGENT ${agent.agent_number_in_instructions} —`);
      } else if (agent.id.startsWith('cdo.')) {
        expect(content).toContain('docs/instructions/CDO-INSTRUCTIONS.md');
      } else if (agent.id.startsWith('cao.')) {
        expect(content).toContain('docs/instructions/CAO-INSTRUCTIONS.md');
      } else if (agent.id.startsWith('cso.')) {
        expect(content).toContain('docs/instructions/CSO-INSTRUCTIONS.md');
      } else {
        throw new Error(`Unhandled director sub-agent prefix: ${agent.id}`);
      }
      expect(content).toContain(`Agent ${agent.agent_number_in_instructions}`);
    }
  });

  it('registry refs point to existing schema modules and frontend copy keys', () => {
    const copyPath = resolve(process.cwd(), '../src/app/config/orchestration-roadmap-ui-copy.en.ts');
    const copyContent = readFileSync(copyPath, 'utf8');
    for (const agent of DIRECTOR_SUB_AGENTS) {
      const schemaPath = resolve(process.cwd(), `../server/src/${agent.output_schema_ref}.ts`);
      expect(existsSync(schemaPath)).toBe(true);
      const titleNeedle = `${agent.id.replaceAll('.', '_')}_title`;
      const descriptionNeedle = `${agent.id.replaceAll('.', '_')}_description`;
      expect(copyContent).toContain(titleNeedle);
      expect(copyContent).toContain(descriptionNeedle);
    }
  });

  it('CAO MVP prompt files align with CAO-INSTRUCTIONS and registry', () => {
    const instructionsPath = resolve(process.cwd(), '../docs/instructions/CAO-INSTRUCTIONS.md');
    const instructions = readFileSync(instructionsPath, 'utf8');
    const caoAgents = DIRECTOR_SUB_AGENTS.filter((a) => a.id.startsWith('cao.'));
    for (const agent of caoAgents) {
      const fromServerCwd = resolve(process.cwd(), agent.prompt_ref);
      const fromRepoRoot = resolve(process.cwd(), '..', agent.prompt_ref);
      const absolute = existsSync(fromServerCwd) ? fromServerCwd : fromRepoRoot;
      expect(existsSync(absolute)).toBe(true);
      const content = readFileSync(absolute, 'utf8');
      expect(content).toContain('docs/instructions/CAO-INSTRUCTIONS.md');
      expect(content).toContain(`Agent ${agent.agent_number_in_instructions}`);
      expect(instructions).toContain(`AGENT ${agent.agent_number_in_instructions} —`);
    }
  });

  it('CSO MVP prompt files align with CSO-INSTRUCTIONS and registry', () => {
    const instructionsPath = resolve(process.cwd(), '../docs/instructions/CSO-INSTRUCTIONS.md');
    const instructions = readFileSync(instructionsPath, 'utf8');
    const csoAgents = DIRECTOR_SUB_AGENTS.filter((a) => a.id.startsWith('cso.'));
    for (const agent of csoAgents) {
      const fromServerCwd = resolve(process.cwd(), agent.prompt_ref);
      const fromRepoRoot = resolve(process.cwd(), '..', agent.prompt_ref);
      const absolute = existsSync(fromServerCwd) ? fromServerCwd : fromRepoRoot;
      expect(existsSync(absolute)).toBe(true);
      const content = readFileSync(absolute, 'utf8');
      expect(content).toContain('docs/instructions/CSO-INSTRUCTIONS.md');
      expect(content).toContain(`Agent ${agent.agent_number_in_instructions}`);
      expect(instructions).toContain(`AGENT ${agent.agent_number_in_instructions} —`);
    }
  });

  it('CDO MVP prompt files align with CDO-INSTRUCTIONS and registry', () => {
    const instructionsPath = resolve(process.cwd(), '../docs/instructions/CDO-INSTRUCTIONS.md');
    const instructions = readFileSync(instructionsPath, 'utf8');
    const cdoAgents = DIRECTOR_SUB_AGENTS.filter((a) => a.id.startsWith('cdo.'));
    for (const agent of cdoAgents) {
      const fromServerCwd = resolve(process.cwd(), agent.prompt_ref);
      const fromRepoRoot = resolve(process.cwd(), '..', agent.prompt_ref);
      const absolute = existsSync(fromServerCwd) ? fromServerCwd : fromRepoRoot;
      expect(existsSync(absolute)).toBe(true);
      const content = readFileSync(absolute, 'utf8');
      expect(content).toContain('docs/instructions/CDO-INSTRUCTIONS.md');
      expect(content).toContain(`Agent ${agent.agent_number_in_instructions}`);
      expect(instructions).toContain(`AGENT ${agent.agent_number_in_instructions} —`);
    }
  });

  it('prompt templates preserve required root payload keys', () => {
    const expectedRoots: Record<string, string[]> = {
      'cmo.agent_1_market': ['market_thesis'],
      'cmo.agent_2_awareness_ladder': ['ladder'],
      'cmo.agent_3_positioning': ['core_problem', 'unique_mechanism', 'positioning_statement'],
      'cmo.agent_4_voice': ['tone_label'],
      'cmo.agent_5_content_strategy': ['ideas'],
      'cmo.agent_6_viral': ['concepts'],
      'cmo.agent_7_storytelling': ['frameworks'],
      'cmo.agent_8_ready_posts': ['posts'],
      'cmo.agent_9_traffic': ['hypotheses'],
      'cmo.agent_10_distribution': ['system_map'],
      'cmo.agent_11_founder_brand': ['narrative_pillars'],
      'cmo.agent_12_growth_loops': ['loops'],
      'cdo.funnel_architect': ['funnel_summary', 'stages'],
      'cdo.friction': ['friction_summary', 'friction_points'],
      'cdo.experimentation': ['experiment_backlog_summary', 'experiments'],
      'cao.process_map': ['process_map_summary', 'critical_paths'],
      'cao.automation_candidates': ['candidate_rankings'],
      'cao.throughput': ['throughput_risks', 'wip_guardrails'],
      'cso.case_classifier': ['case_label', 'scope_notes'],
      'cso.threat_model': ['threat_summary', 'top_threats'],
      'cso.compliance_map': ['compliance_summary', 'control_priorities'],
    };
    for (const agent of DIRECTOR_SUB_AGENTS) {
      const fromServerCwd = resolve(process.cwd(), agent.prompt_ref);
      const fromRepoRoot = resolve(process.cwd(), '..', agent.prompt_ref);
      const absolute = existsSync(fromServerCwd) ? fromServerCwd : fromRepoRoot;
      const content = readFileSync(absolute, 'utf8');
      for (const key of expectedRoots[agent.id] ?? []) {
        expect(content).toContain(`\`${key}\``);
      }
    }
  });

  it('allows only explicitly allowlisted cross-domain dependencies', () => {
    const byId = new Map(DIRECTOR_SUB_AGENTS.map((agent) => [agent.id, agent] as const));
    const allowlist = new Set(
      DIRECTOR_CROSS_DOMAIN_DEPENDENCY_ALLOWLIST.map((edge) => `${edge.from}->${edge.to}`),
    );
    for (const agent of DIRECTOR_SUB_AGENTS) {
      const domainPrefix = agent.id.split('.')[0];
      for (const dep of agent.depends_on) {
        const depNode = byId.get(dep);
        expect(depNode, `dependency "${dep}" referenced by "${agent.id}" must exist`).toBeDefined();
        if (!dep.startsWith(`${domainPrefix}.`)) {
          expect(allowlist.has(`${agent.id}->${dep}`), `"${agent.id}" depends on non-allowlisted cross-domain "${dep}"`).toBe(true);
        }
      }
    }
  });
});
