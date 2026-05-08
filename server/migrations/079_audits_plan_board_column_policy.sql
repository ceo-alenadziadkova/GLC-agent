-- Epic 3: optional per-audit Delivery Board column policy (custom column ids + semantic map).

ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS plan_board_column_policy jsonb NULL;

COMMENT ON COLUMN public.audits.plan_board_column_policy IS
  'nullable JSON column policy v1 ({ schema_version, columns[], semantics{} }) for Delivery Board; see ADR-PLAN-BOARD-CUSTOM-COLUMNS-EPIC3.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_board_custom_columns_entitled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.plan_board_custom_columns_entitled IS
  'when global feature is on, audit owner may persist custom board column ids (Epic 3).';
