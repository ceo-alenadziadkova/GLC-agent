import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIRECTOR_CROSS_DOMAIN_DEPENDENCY_ALLOWLIST, DIRECTOR_SUB_AGENTS } from '../config/director-sub-agents.js';
import {
  DIRECTOR_MODE_AGENT_DEPTHS,
  DIRECTOR_OPERATING_MODES,
} from '../config/director-operating-modes.js';

describe('director sub-agent registry consistency', () => {
  it('has existing prompt files with source-of-truth header and matching agent references', () => {
    const cmoInstructionsPath = resolve(process.cwd(), '../docs/instructions/CMO-INSTRUCTIONS.md');
    const cmoInstructions = readFileSync(cmoInstructionsPath, 'utf8');
    const ctoInstructionsPath = resolve(process.cwd(), '../docs/instructions/CTO-INSTRUCTIONS.md');
    const ctoInstructions = readFileSync(ctoInstructionsPath, 'utf8');
    const seoInstructionsPath = resolve(process.cwd(), '../docs/instructions/SEO-INSTRUCTIONS.md');
    const seoInstructions = readFileSync(seoInstructionsPath, 'utf8');
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
      } else if (agent.id.startsWith('cto.')) {
        expect(content).toContain('docs/instructions/CTO-INSTRUCTIONS.md');
        expect(ctoInstructions).toContain(`AGENT ${agent.agent_number_in_instructions} —`);
      } else if (agent.id.startsWith('seo.')) {
        expect(content).toContain('docs/instructions/SEO-INSTRUCTIONS.md');
        expect(seoInstructions).toContain(`AGENT ${agent.agent_number_in_instructions} —`);
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
      'cto.readiness_baseline': ['readiness_summary', 'fragility_zones', 'top_unknowns'],
      'cto.architecture_risk_model': ['architecture_risk_summary', 'critical_risks', 'coupling_hotspots'],
      'cto.reliability_runtime': ['runtime_reliability_summary', 'reliability_gaps', 'guardrails'],
      'cto.observability_incident': ['observability_summary', 'telemetry_gaps', 'incident_readiness_actions'],
      'cto.delivery_release_safety': ['release_safety_summary', 'release_risks', 'rollback_controls'],
      'cto.security_supply_chain': ['supply_chain_summary', 'security_gaps', 'security_controls'],
      'cto.data_platform_resilience': ['data_resilience_summary', 'resilience_risks', 'recovery_priorities'],
      'cto.roadmap_tradeoffs': ['tradeoff_summary', 'decision_tradeoffs', 'critical_path_checkpoints'],
      'seo.visibility_baseline': ['visibility_baseline_summary', 'structural_constraints', 'missing_evidence'],
      'seo.technical_indexability': ['technical_indexability_summary', 'indexability_blockers', 'remediation_priorities'],
      'seo.ia_internal_links': ['ia_linking_summary', 'discoverability_gaps', 'linking_actions'],
      'seo.content_intent_coverage': ['content_intent_summary', 'intent_gaps', 'opportunity_clusters'],
      'seo.serp_ctr_levers': ['serp_ctr_summary', 'ctr_levers', 'snippet_tests'],
      'seo.authority_trust': ['authority_trust_summary', 'trust_gaps', 'credibility_actions'],
      'seo.local_international_readiness': ['local_international_summary', 'readiness_gaps', 'expansion_prerequisites'],
      'seo.measurement_experimentation': ['measurement_experimentation_summary', 'kpi_tree', 'experiment_backlog'],
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

  it('keeps operating mode depth map synchronized with director sub-agent registry', () => {
    for (const mode of DIRECTOR_OPERATING_MODES) {
      const depthByAgentId = DIRECTOR_MODE_AGENT_DEPTHS[mode];
      expect(depthByAgentId).toBeDefined();
      for (const agent of DIRECTOR_SUB_AGENTS) {
        expect(depthByAgentId[agent.id], `missing depth for "${agent.id}" in mode "${mode}"`).toBeDefined();
      }
    }
  });
});
