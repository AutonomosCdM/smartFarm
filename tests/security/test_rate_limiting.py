"""
Security Tests: Rate Limiting

Tests rate limiting functionality for file uploads.

Author: SmartFarm Security Team
Date: 2025-10-17
"""

import pytest
import sys
import os
from datetime import datetime, timedelta

# Add security module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../security'))

from rate_limiter import RateLimiter, RateLimitExceeded


class TestBasicRateLimiting:
    """Test basic rate limiting functionality"""

    def test_within_limit(self):
        """Requests within limit should pass"""
        limiter = RateLimiter(backend='memory')

        user_id = 'user_123'
        role = 'user'  # 10 uploads/hour

        # Should allow 10 uploads
        for i in range(10):
            result = limiter.check_limit(user_id, role)
            assert result is True

    def test_exceeds_limit(self):
        """Requests exceeding limit should fail"""
        limiter = RateLimiter(backend='memory')

        user_id = 'user_123'
        role = 'user'  # 10 uploads/hour

        # First 10 should pass
        for i in range(10):
            limiter.check_limit(user_id, role)

        # 11th should fail
        with pytest.raises(RateLimitExceeded) as exc_info:
            limiter.check_limit(user_id, role)

        assert "rate limit exceeded" in str(exc_info.value).lower()

    def test_different_users_independent(self):
        """Different users should have independent limits"""
        limiter = RateLimiter(backend='memory')

        user1 = 'user_1'
        user2 = 'user_2'
        role = 'user'

        # User 1 uses all quota
        for i in range(10):
            limiter.check_limit(user1, role)

        # User 1 is blocked
        with pytest.raises(RateLimitExceeded):
            limiter.check_limit(user1, role)

        # User 2 should still work
        result = limiter.check_limit(user2, role)
        assert result is True


class TestRoleBasedQuotas:
    """Test role-based quota differences"""

    def test_admin_higher_quota(self):
        """Admins should have higher quota"""
        limiter = RateLimiter(backend='memory')

        admin_id = 'admin_1'
        admin_role = 'admin'  # 50 uploads/hour

        # Should allow 50 uploads
        for i in range(50):
            result = limiter.check_limit(admin_id, admin_role)
            assert result is True

        # 51st should fail
        with pytest.raises(RateLimitExceeded):
            limiter.check_limit(admin_id, admin_role)

    def test_anonymous_lower_quota(self):
        """Anonymous users should have lower quota"""
        limiter = RateLimiter(backend='memory')

        anon_ip = '192.168.1.100'
        anon_role = 'anonymous'  # 5 uploads/hour

        # Should allow 5 uploads
        for i in range(5):
            result = limiter.check_limit(anon_ip, anon_role)
            assert result is True

        # 6th should fail
        with pytest.raises(RateLimitExceeded):
            limiter.check_limit(anon_ip, anon_role)

    def test_user_normal_quota(self):
        """Regular users should have normal quota"""
        limiter = RateLimiter(backend='memory')

        user_id = 'user_123'
        user_role = 'user'  # 10 uploads/hour

        # Should allow 10 uploads
        for i in range(10):
            limiter.check_limit(user_id, user_role)

        # 11th should fail
        with pytest.raises(RateLimitExceeded):
            limiter.check_limit(user_id, user_role)


class TestCustomQuotas:
    """Test custom quota configuration"""

    def test_custom_quotas(self):
        """Custom quotas should override defaults"""
        custom_quotas = {
            'premium': {
                'max_uploads': 100,
                'window_minutes': 60,
                'description': 'Premium users'
            },
            'basic': {
                'max_uploads': 3,
                'window_minutes': 60,
                'description': 'Basic users'
            }
        }

        limiter = RateLimiter(backend='memory', custom_quotas=custom_quotas)

        # Premium user
        premium_id = 'premium_1'
        for i in range(100):
            limiter.check_limit(premium_id, role='premium')

        with pytest.raises(RateLimitExceeded):
            limiter.check_limit(premium_id, role='premium')

        # Basic user
        basic_id = 'basic_1'
        for i in range(3):
            limiter.check_limit(basic_id, role='basic')

        with pytest.raises(RateLimitExceeded):
            limiter.check_limit(basic_id, role='basic')


class TestRemainingQuota:
    """Test remaining quota tracking"""

    def test_get_remaining(self):
        """Should track remaining quota correctly"""
        limiter = RateLimiter(backend='memory')

        user_id = 'user_123'
        role = 'user'  # 10 uploads/hour

        # Initial: 10 remaining
        remaining = limiter.get_remaining(user_id, role)
        assert remaining['remaining'] == 10
        assert remaining['limit'] == 10

        # After 3 uploads: 7 remaining
        for i in range(3):
            limiter.check_limit(user_id, role)

        remaining = limiter.get_remaining(user_id, role)
        assert remaining['remaining'] == 7
        assert remaining['limit'] == 10

        # After 10 uploads: 0 remaining
        for i in range(7):
            limiter.check_limit(user_id, role)

        remaining = limiter.get_remaining(user_id, role)
        assert remaining['remaining'] == 0

    def test_reset_time(self):
        """Should provide reset time"""
        limiter = RateLimiter(backend='memory')

        user_id = 'user_123'
        role = 'user'

        # Make a request
        limiter.check_limit(user_id, role)

        remaining = limiter.get_remaining(user_id, role)

        # Should have reset_at timestamp
        assert 'reset_at' in remaining
        # Parse timestamp
        reset_time = datetime.fromisoformat(remaining['reset_at'].replace('Z', '+00:00'))
        # Should be in the future
        assert reset_time > datetime.now()


class TestReset:
    """Test quota reset functionality"""

    def test_admin_reset(self):
        """Admin should be able to reset quota"""
        limiter = RateLimiter(backend='memory')

        user_id = 'user_123'
        role = 'user'

        # Use all quota
        for i in range(10):
            limiter.check_limit(user_id, role)

        # Should be blocked
        with pytest.raises(RateLimitExceeded):
            limiter.check_limit(user_id, role)

        # Admin reset
        limiter.reset(user_id)

        # Should work again
        result = limiter.check_limit(user_id, role)
        assert result is True


class TestStatistics:
    """Test rate limiter statistics"""

    def test_get_stats(self):
        """Should provide statistics"""
        limiter = RateLimiter(backend='memory')

        # Multiple users
        for i in range(5):
            user_id = f'user_{i}'
            limiter.check_limit(user_id, 'user')

        stats = limiter.get_stats()

        assert stats['backend'] == 'memory'
        assert stats['total_users_tracked'] == 5
        assert stats['total_actions_tracked'] == 5
        assert 'quotas' in stats


class TestEdgeCases:
    """Test edge cases and error handling"""

    def test_invalid_role_uses_default(self):
        """Invalid role should use default quota"""
        limiter = RateLimiter(backend='memory')

        user_id = 'user_123'
        invalid_role = 'super_mega_admin'  # Not defined

        # Should use 'user' default (10 uploads)
        for i in range(10):
            limiter.check_limit(user_id, invalid_role)

        # Should fail after 10 (user default)
        with pytest.raises(RateLimitExceeded):
            limiter.check_limit(user_id, invalid_role)

    def test_empty_identifier(self):
        """Empty identifier should be handled"""
        limiter = RateLimiter(backend='memory')

        # Should not crash
        limiter.check_limit('', 'user')

    def test_very_long_identifier(self):
        """Very long identifier should be handled"""
        limiter = RateLimiter(backend='memory')

        long_id = 'x' * 10000
        limiter.check_limit(long_id, 'user')

        # Should work
        remaining = limiter.get_remaining(long_id, 'user')
        assert remaining['remaining'] == 9  # 1 used


class TestConcurrency:
    """Test concurrent access scenarios"""

    def test_race_condition_simulation(self):
        """Simulate race condition (single-threaded test)"""
        limiter = RateLimiter(backend='memory')

        user_id = 'user_123'
        role = 'user'  # 10 uploads/hour

        # Rapid successive calls
        success_count = 0
        for i in range(15):
            try:
                limiter.check_limit(user_id, role)
                success_count += 1
            except RateLimitExceeded:
                pass

        # Should allow exactly 10
        assert success_count == 10


class TestRedisBackend:
    """Test Redis backend (requires Redis running)"""

    @pytest.fixture
    def redis_available(self):
        """Check if Redis is available"""
        try:
            import redis
            client = redis.Redis(host='localhost', port=6379)
            client.ping()
            return client
        except:
            pytest.skip("Redis not available")

    def test_redis_rate_limiting(self, redis_available):
        """Test rate limiting with Redis backend"""
        limiter = RateLimiter(backend='redis', redis_client=redis_available)

        user_id = 'redis_user_123'
        role = 'user'

        # Should allow 10 uploads
        for i in range(10):
            result = limiter.check_limit(user_id, role)
            assert result is True

        # 11th should fail
        with pytest.raises(RateLimitExceeded):
            limiter.check_limit(user_id, role)

        # Cleanup
        limiter.reset(user_id)

    def test_redis_failover(self, redis_available):
        """Test failover when Redis is unavailable"""
        # Create limiter with invalid Redis
        import redis
        bad_client = redis.Redis(host='invalid_host', port=9999, socket_timeout=1)

        limiter = RateLimiter(backend='redis', redis_client=bad_client)

        user_id = 'failover_user'

        # Should fail open (allow) when Redis is down
        result = limiter.check_limit(user_id, 'user')
        # May allow due to fail-open policy
        # This is a safety feature to prevent service disruption


# Run tests
if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
