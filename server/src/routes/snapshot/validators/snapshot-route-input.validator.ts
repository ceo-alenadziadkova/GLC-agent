import { z } from 'zod';

const requiredTrimmedString = z.string().trim().min(1);

export const startSnapshotBodySchema = z.object({
  company_url: requiredTrimmedString,
});

export const claimSnapshotBodySchema = z.object({
  snapshot_token: requiredTrimmedString,
});

export const compareSnapshotBodySchema = z.object({
  self_url: requiredTrimmedString,
  competitor_url: requiredTrimmedString,
});

export const operatorPurgeCacheBodySchema = z.object({
  host: requiredTrimmedString,
});
