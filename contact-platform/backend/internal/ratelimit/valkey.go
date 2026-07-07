package ratelimit

import (
	"context"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

var incrementWithTTL = redis.NewScript(`
local count = redis.call("INCR", KEYS[1])
if count == 1 then
	redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return count
`)

type Limiter struct {
	client *redis.Client
	prefix string
	limit  int
	window time.Duration
}

func New(client *redis.Client, prefix string, limit int, window time.Duration) *Limiter {
	if limit < 1 {
		limit = 1
	}
	if window <= 0 {
		window = time.Minute
	}
	return &Limiter{
		client: client,
		prefix: strings.Trim(prefix, ":"),
		limit:  limit,
		window: window,
	}
}

func (l *Limiter) Allow(ctx context.Context, key string) (bool, error) {
	count, err := incrementWithTTL.Run(ctx, l.client, []string{l.key(key)}, l.window.Milliseconds()).Int()
	if err != nil {
		return false, err
	}
	return count <= l.limit, nil
}

func (l *Limiter) Ping(ctx context.Context) error {
	return l.client.Ping(ctx).Err()
}

func (l *Limiter) key(key string) string {
	key = strings.TrimSpace(key)
	if key == "" {
		key = "unknown"
	}
	return l.prefix + ":" + key
}
