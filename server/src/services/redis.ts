import { createClient } from 'redis';
import { logger } from './logger.js';

type RedisClient = ReturnType<typeof createClient>;

let sharedClient: RedisClient | null = null;

export function getRedisUrl(): string {
  return (
    process.env.PIPELINE_QUEUE_REDIS_URL?.trim()
    || process.env.RATE_LIMIT_REDIS_URL?.trim()
    || ''
  );
}

export function getSharedRedisClient(): RedisClient | null {
  const url = getRedisUrl();
  if (!url) return null;
  if (sharedClient) return sharedClient;

  const client = createClient({ url });
  client.on('error', (err) => {
    logger.warn('redis.shared_client_error', {
      error: err instanceof Error ? err.message : String(err),
    });
  });
  void client.connect();
  sharedClient = client;
  return client;
}

