import { createClient } from 'redis';
import { getPipelineWorkerRedisUrl } from '../config/redis-infra.js';
import { logger } from './logger.js';

type RedisClient = ReturnType<typeof createClient>;

let sharedClient: RedisClient | null = null;

export function getRedisUrl(): string {
  return getPipelineWorkerRedisUrl();
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

