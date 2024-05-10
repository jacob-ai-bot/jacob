import Redis from "ioredis";

const connectionUrl =
  process.env.NODE_ENV === "test"
    ? process.env.PUBSUB_REDIS_TEST_URL
    : process.env.PUBSUB_REDIS_URL;

export function newRedisConnection() {
  if (!connectionUrl) {
    throw new Error("PUBSUB_REDIS_URL not defined in environment");
  }
  return new Redis(connectionUrl);
}
