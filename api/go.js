export default async function handler(req, res) {
  const DEST = "https://antoresellvinted.myshopify.com";
  const slug = (req.query.slug || "home").toString();

  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;

  if (!redisUrl || !redisToken) {
    return res.status(500).send("Missing KV env vars (KV_REST_API_URL / KV_REST_API_TOKEN)");
  }

  // 1) Incr compteur
  const key = `clicks:${slug}`;
  let count = null;

  try {
    const incrResp = await fetch(`${redisUrl}/incr/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    });
    const incrJson = await incrResp.json();
    count = incrJson?.result ?? null;
  } catch (e) {
    // On continue quand même
  }

  // 2) Envoi Discord (on await pour être sûr que ça parte)
  if (discordWebhook) {
    try {
      const embed = {
        title: "📈 Nouveau clic",
        description: `Slug : **${slug}**`,
        fields: [
          { name: "Total de clics", value: count === null ? "?" : String(count), inline: true }
        ],
        timestamp: new Date().toISOString(),
      };

      await fetch(discordWebhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (e) {
      // Ignore discord errors
    }
  }

  // 3) Redirect
  res.writeHead(302, { Location: DEST });
  res.end();
}
