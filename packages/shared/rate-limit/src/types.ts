export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec?: number;
};
