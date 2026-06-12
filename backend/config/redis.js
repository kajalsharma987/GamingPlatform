let redis = null;

function getRedis() {
  if (redis) return redis;
  if (!process.env.REDIS_URL) return null;

  try {
    const Redis = require("ioredis");
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false
    });
    redis.on("error", (err) => console.log("Redis warning:", err.message));
  } catch (err) {
    console.log("Redis disabled:", err.message);
  }

  return redis;
}

async function cacheSet(key, value, ttlSeconds = 30) {
  const client = getRedis();
  if (!client) return;
  await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
}

async function cacheGet(key) {
  const client = getRedis();
  if (!client) return null;
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
}

module.exports = {
  getRedis,
  cacheSet,
  cacheGet
};
