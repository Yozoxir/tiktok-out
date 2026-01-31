export default async function handler(req, res) {
  const DEST = "https://antoressel.com"; // ton site final
  const slug = (req.query.slug || "home").toString();

  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;

  if (!redisUrl || !redisToken) {
    return res.status(500).send("Missing KV env vars");
  }

  // +1 compteur
  const key = `clicks:${slug}`;
  const incrResp = await fetch(`${redisUrl}/incr/${encodeURIComponent(key)}`, {
    headers: {
      Authorization: `Bearer ${redisToken}`,
    },
  });

  const incrJson = await incrResp.json();
  const count = incrJson.result;

  // Envoi webhook Discord
  if (discordWebhook) {
    const embed = {
      title: "📈 Nouveau clic",
      description: `Slug : **${slug}**`,
      fields: [
        { name: "Total de clics", value: String(count), inline: true }
      ],
      color: 5814783,
      timestamp: new Date().toISOString()
    };

    await fetch(discordWebhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    }).catch(() => {});
  }

  // Redirection
  res.writeHead(302, { Location: DEST });
  res.end();
}
