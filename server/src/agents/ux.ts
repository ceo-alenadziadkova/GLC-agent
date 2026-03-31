import { BaseAgent, loadPrompt } from './base.js';
import { AccessibilityCollector } from '../collectors/accessibility.js';
import { UxCollector } from '../collectors/ux.js';
import { DomainOutputSchema } from '../schemas/domain-output.js';

export class UxAgent extends BaseAgent {
  get phaseNumber() { return 4; }
  get domainKey() { return 'ux_conversion' as const; }
  get outputSchema() { return DomainOutputSchema; }
  get collectors() {
    return [new AccessibilityCollector(), new UxCollector()];
  }

  get instructions() { return loadPrompt('ux_conversion'); }
}
