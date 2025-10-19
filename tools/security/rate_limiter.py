"""
Rate Limiting for File Uploads

Prevents abuse by limiting uploads per user/IP with configurable quotas.
Supports both in-memory (development) and Redis (production) backends.

Author: SmartFarm Security Team
Date: 2025-10-17
"""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Literal
import logging

logger = logging.getLogger(__name__)


class RateLimitExceeded(Exception):
    """Exception raised when rate limit is exceeded"""
    pass


class RateLimiter:
    """
    Rate limiter with role-based quotas

    Supports:
    - Per-user limits (authenticated users)
    - Per-IP limits (anonymous users)
    - Role-based quotas (admin, user, anonymous)
    - In-memory or Redis backend
    """

    # Default quotas (configurable)
    DEFAULT_QUOTAS = {
        'admin': {
            'max_uploads': 50,
            'window_minutes': 60,
            'description': 'Admin users: 50 uploads/hour'
        },
        'user': {
            'max_uploads': 10,
            'window_minutes': 60,
            'description': 'Regular users: 10 uploads/hour'
        },
        'anonymous': {
            'max_uploads': 5,
            'window_minutes': 60,
            'description': 'Anonymous users: 5 uploads/hour'
        },
    }

    def __init__(
        self,
        backend: Literal['memory', 'redis'] = 'memory',
        redis_client=None,
        custom_quotas: Optional[Dict] = None
    ):
        """
        Initialize rate limiter

        Args:
            backend: 'memory' for development, 'redis' for production
            redis_client: Redis client instance (required if backend='redis')
            custom_quotas: Override default quotas
        """
        self.backend = backend
        self.redis_client = redis_client

        if backend == 'redis' and not redis_client:
            raise ValueError("Redis client required for Redis backend")

        # In-memory storage (development only)
        self._memory_store = defaultdict(list)

        # Load quotas
        self.quotas = custom_quotas or self.DEFAULT_QUOTAS

    def check_limit(
        self,
        identifier: str,
        role: str = 'user',
        action: str = 'upload'
    ) -> bool:
        """
        Check if action is allowed within rate limit

        Args:
            identifier: User ID or IP address
            role: User role (admin, user, anonymous)
            action: Action type (for future multi-action support)

        Returns:
            True if allowed, False if limit exceeded

        Raises:
            RateLimitExceeded: If limit is exceeded
        """

        # Get quota for role
        quota = self.quotas.get(role, self.quotas['user'])
        max_uploads = quota['max_uploads']
        window_minutes = quota['window_minutes']

        # Check limit based on backend
        if self.backend == 'memory':
            allowed = self._check_memory_limit(
                identifier, max_uploads, window_minutes
            )
        else:
            allowed = self._check_redis_limit(
                identifier, max_uploads, window_minutes
            )

        if not allowed:
            raise RateLimitExceeded(
                f"Rate limit exceeded for {role}. "
                f"Limit: {max_uploads} uploads per {window_minutes} minutes. "
                f"Try again later."
            )

        return True

    def _check_memory_limit(
        self,
        identifier: str,
        max_uploads: int,
        window_minutes: int
    ) -> bool:
        """Check rate limit using in-memory storage"""

        key = f"uploads:{identifier}"
        now = datetime.now()
        cutoff = now - timedelta(minutes=window_minutes)

        # Clean old entries
        self._memory_store[key] = [
            ts for ts in self._memory_store[key]
            if ts > cutoff
        ]

        # Check limit
        current_count = len(self._memory_store[key])

        if current_count >= max_uploads:
            logger.warning(
                f"Rate limit exceeded for {identifier}: "
                f"{current_count}/{max_uploads} in {window_minutes}min"
            )
            return False

        # Record this action
        self._memory_store[key].append(now)

        logger.info(
            f"Rate limit check passed for {identifier}: "
            f"{current_count + 1}/{max_uploads} in {window_minutes}min"
        )

        return True

    def _check_redis_limit(
        self,
        identifier: str,
        max_uploads: int,
        window_minutes: int
    ) -> bool:
        """Check rate limit using Redis (production)"""

        key = f"uploads:{identifier}"
        now = datetime.now()
        cutoff = now - timedelta(minutes=window_minutes)

        # Use Redis sorted set for time-based tracking
        # Score = timestamp, value = timestamp (for uniqueness)
        timestamp = now.timestamp()

        try:
            # Add current timestamp
            self.redis_client.zadd(key, {timestamp: timestamp})

            # Remove old entries
            self.redis_client.zremrangebyscore(key, 0, cutoff.timestamp())

            # Set expiration (cleanup)
            self.redis_client.expire(key, window_minutes * 60)

            # Count current entries
            current_count = self.redis_client.zcard(key)

            if current_count > max_uploads:
                logger.warning(
                    f"Rate limit exceeded (Redis) for {identifier}: "
                    f"{current_count}/{max_uploads} in {window_minutes}min"
                )
                # Remove the entry we just added since it exceeded
                self.redis_client.zrem(key, timestamp)
                return False

            logger.info(
                f"Rate limit check passed (Redis) for {identifier}: "
                f"{current_count}/{max_uploads} in {window_minutes}min"
            )

            return True

        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}")
            # Fail open (allow) on Redis errors to prevent service disruption
            return True

    def get_remaining(
        self,
        identifier: str,
        role: str = 'user'
    ) -> Dict[str, Any]:
        """
        Get remaining quota for identifier

        Returns:
            Dict with 'remaining', 'limit', 'reset_at' keys
        """

        quota = self.quotas.get(role, self.quotas['user'])
        max_uploads = quota['max_uploads']
        window_minutes = quota['window_minutes']

        if self.backend == 'memory':
            key = f"uploads:{identifier}"
            now = datetime.now()
            cutoff = now - timedelta(minutes=window_minutes)

            # Clean old entries
            self._memory_store[key] = [
                ts for ts in self._memory_store[key]
                if ts > cutoff
            ]

            current_count = len(self._memory_store[key])
            remaining = max(0, max_uploads - current_count)

            # Find oldest entry for reset time
            if self._memory_store[key]:
                oldest = min(self._memory_store[key])
                reset_at = oldest + timedelta(minutes=window_minutes)
            else:
                reset_at = now

        else:  # Redis
            key = f"uploads:{identifier}"
            now = datetime.now()
            cutoff = now - timedelta(minutes=window_minutes)

            try:
                # Clean old entries
                self.redis_client.zremrangebyscore(key, 0, cutoff.timestamp())

                # Count current
                current_count = self.redis_client.zcard(key)
                remaining = max(0, max_uploads - current_count)

                # Get oldest entry
                oldest_entries = self.redis_client.zrange(key, 0, 0, withscores=True)
                if oldest_entries:
                    oldest_ts = oldest_entries[0][1]
                    reset_at = datetime.fromtimestamp(oldest_ts) + timedelta(minutes=window_minutes)
                else:
                    reset_at = now

            except Exception as e:
                logger.error(f"Redis get_remaining failed: {e}")
                remaining = max_uploads
                reset_at = now

        return {
            'remaining': remaining,
            'limit': max_uploads,
            'window_minutes': window_minutes,
            'reset_at': reset_at.isoformat(),
        }

    def reset(self, identifier: str) -> None:
        """Reset rate limit for identifier (admin override)"""

        key = f"uploads:{identifier}"

        if self.backend == 'memory':
            if key in self._memory_store:
                del self._memory_store[key]
                logger.info(f"Rate limit reset (memory) for {identifier}")
        else:
            try:
                self.redis_client.delete(key)
                logger.info(f"Rate limit reset (Redis) for {identifier}")
            except Exception as e:
                logger.error(f"Redis reset failed: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """Get rate limiter statistics"""

        if self.backend == 'memory':
            total_users = len(self._memory_store)
            total_actions = sum(len(v) for v in self._memory_store.values())
        else:
            try:
                # Redis: count all upload keys
                keys = self.redis_client.keys('uploads:*')
                total_users = len(keys)
                total_actions = sum(
                    self.redis_client.zcard(key) for key in keys
                )
            except Exception as e:
                logger.error(f"Redis stats failed: {e}")
                total_users = 0
                total_actions = 0

        return {
            'backend': self.backend,
            'total_users_tracked': total_users,
            'total_actions_tracked': total_actions,
            'quotas': self.quotas,
        }


# Convenience functions
_default_limiter: Optional[RateLimiter] = None


def init_rate_limiter(
    backend: Literal['memory', 'redis'] = 'memory',
    redis_client=None,
    custom_quotas: Optional[Dict] = None
) -> RateLimiter:
    """Initialize global rate limiter"""
    global _default_limiter
    _default_limiter = RateLimiter(backend, redis_client, custom_quotas)
    return _default_limiter


def check_rate_limit(
    identifier: str,
    role: str = 'user',
    action: str = 'upload'
) -> bool:
    """
    Check rate limit (convenience function)

    Raises:
        RateLimitExceeded: If limit exceeded
        ValueError: If rate limiter not initialized
    """
    if not _default_limiter:
        raise ValueError("Rate limiter not initialized. Call init_rate_limiter() first")

    return _default_limiter.check_limit(identifier, role, action)


def get_remaining_quota(identifier: str, role: str = 'user') -> Dict[str, Any]:
    """Get remaining quota (convenience function)"""
    if not _default_limiter:
        raise ValueError("Rate limiter not initialized")

    return _default_limiter.get_remaining(identifier, role)


# Example usage
if __name__ == '__main__':
    # Development mode (in-memory)
    limiter = init_rate_limiter(backend='memory')

    # Simulate user uploads
    user_id = 'user123'
    role = 'user'

    print(f"Testing rate limiter for {role} (limit: 10/hour)")

    for i in range(15):
        try:
            limiter.check_limit(user_id, role)
            print(f"  ✅ Upload {i+1} allowed")

            # Show remaining
            remaining = limiter.get_remaining(user_id, role)
            print(f"     Remaining: {remaining['remaining']}/{remaining['limit']}")

        except RateLimitExceeded as e:
            print(f"  ❌ Upload {i+1} blocked: {e}")

    # Show stats
    stats = limiter.get_stats()
    print(f"\nRate Limiter Stats:")
    print(f"  Backend: {stats['backend']}")
    print(f"  Users tracked: {stats['total_users_tracked']}")
    print(f"  Total actions: {stats['total_actions_tracked']}")

    # Admin reset
    print(f"\nAdmin reset for {user_id}")
    limiter.reset(user_id)

    # Try again
    try:
        limiter.check_limit(user_id, role)
        print(f"  ✅ Upload allowed after reset")
    except RateLimitExceeded as e:
        print(f"  ❌ Still blocked: {e}")
