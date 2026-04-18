/**
 * Compatibility facade for CONTROL_OBJECT contract modules.
 * Keep this path stable while consumers migrate to folder-based imports.
 */
export * from './control-object/index.js';
export { createControlObjectV1 } from '../services/fact-checker/control-object/factory/create-control-object.js';
