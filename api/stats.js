import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const slug = "home";

  const clicks = (await redis.get(`clicks:${slug}`)) || 0;

  res.status(200).json({
    slug,
    clicks,
  });
}
