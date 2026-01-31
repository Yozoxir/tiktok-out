export default async function handler(req, res) {
  const slug = (req.query.slug || "home").toString();
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return res.status(500).send("Missing Upstash env vars");
  }

  const key = `clicks:${slug}`;
  const getResp = await fetch(`${redisUrl}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });

  const getJson = await getResp.json();
  const clicks = Number(getJson?.result ?? 0) || 0;

  res.status(200).json({ slug, clicks });
}
