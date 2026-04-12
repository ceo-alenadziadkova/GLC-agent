-- Explicit audit depth for marketing brief (express vs full). Not used for routing when user is unsure or has no site.
ALTER TABLE marketing_brief_submissions
    ADD COLUMN IF NOT EXISTS preferred_audit_depth text
    CHECK (preferred_audit_depth IS NULL OR preferred_audit_depth IN ('express', 'full'));
COMMENT ON COLUMN marketing_brief_submissions.preferred_audit_depth IS
  'When user has a public site and is sure about format: express = lighter-scope audit path, full = maximum depth. Null when unsure_choice or no_website.';
