export { ORCHESTRATION_BOARD_UI_COPY } from './board.en';
export { ORCHESTRATION_ERRORS_UI_COPY } from './errors.en';
export * from './formatters';
export { ORCHESTRATION_IA_COPY } from './ia-copy.en';
export * from './labels.en';
export { ORCHESTRATION_TABLE_UI_COPY } from './table.en';
export { ORCHESTRATION_WIZARD_UI_COPY } from './wizard.en';

/**
 * Backward-compatible aggregate exports:
 * legacy consumers can keep importing from `orchestration-roadmap-ui-copy.en`.
 * New consumers may use this folder index entrypoint.
 */
export * from '../orchestration-roadmap-ui-copy.en';
