export const DIRECTOR_DEEP_DIVE_QUEUE = {
  queueName: 'director_deep_dive',
  defaultAttempts: 3,
  backoffDelayMs: 1_500,
  estimatedDurationMinutes: 4,
} as const;
