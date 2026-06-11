import redisClient from "../../config/redis";

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
  // ✅ DESPUÉS — reemplaza todo eso con esto
  const pipeline = redis.multi();
  pipeline.incr(key);
  pipeline.expire(key, windowSeconds, "NX"); // solo setea TTL si no tiene uno ya
  pipeline.ttl(key);

  const results = await pipeline.exec();
  const attempts = results[0] as unknown as number;
  const ttl = results[2] as unknown as number;

  return {
    allowed: attempts <= max,
    remaining: Math.max(0, max - attempts),
    retryAfter: attempts > max && ttl > 0 ? ttl : undefined,
    attempts,
    ttl,
  };
};
