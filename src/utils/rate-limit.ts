import redisClient from "../config/redis";

type RateLimitInput = {
  redis: typeof redisClient;
  key: string;
  windowSeconds: number;
  max: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  attempts: number;
  ttl: number;
};

export const rateLimit = async ({
  redis,
  key,
  windowSeconds,
  max,
}: RateLimitInput): Promise<RateLimitResult> => {
  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);

  return {
    allowed: attempts <= max,
    remaining: Math.max(0, max - attempts),
    retryAfter: ttl > 0 ? ttl : undefined,
    attempts,
    ttl,
  };
};
