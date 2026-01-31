import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const slug = "home"; // nom du compteur

  await redis.incr(`clicks:${slug}`);

  res.writeHead(302, {
    Location: "https://antoressel.com", // ton vrai site
  });
  res.end();
}
