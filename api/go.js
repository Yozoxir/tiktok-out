export default async function handler(req, res) {
  const DEST = "https://antoressel.com"; // destination finale
  const slug = (req.query.slug || "home").toString();

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;

  if (!redisUrl || !redisToken) {
    return res.status(500).send("Missing Upstash env vars");
  }

  // 1) INCR compteur via Upstash REST (retourne la nouvelle valeur)
  const key = `clicks:${slug}`;
  const incrResp = await fetch(`${redisUrl}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${redisToken}` },
  });

  const incrJson = await incrResp.json();
  const count = incrJson?.result ?? null;

  // 2) Envoi Discord webhook (embed)
  // ⚠️ Discord rate limit si tu as beaucoup de clics : pour gros trafic, faut buffer.
  if (discordWebhook) {
    const now = new Date().toISOString();

    // petit “device detect” basique
    const ua = (req.headers["user-agent"] || "").toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isTikTok =
      ua.includes("tiktok") ||
      ua.includes("bytedance") ||
      ua.includes("musical.ly") ||
      ua.includes("aweme") ||
      ua.includes("ttwebview");

    const embed = {
      title: "📈 Nouveau clic",
      description: `Slug: **${slug}**`,
      fields: [
        { name: "Total clics", value: count === null ? "?" : String(count), inline: true },
        { name: "TikTok WebView", value: isTikTok ? "Oui" : "Non", inline: true },
        {
          name: "Device",
          value: isIOS ? "iOS" : isAndroid ? "Android" : "Autre",
          inline: true,
        },
      ],
      timestamp: now,
    };

    // On n'attend pas Discord pour rediriger trop lentement.
    // Mais en serverless, mieux vaut await quand même pour fiabilité.
    await fetch(discordWebhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    }).catch(() => {});
  }

  // 3) Redirect
  res.writeHead(302, { Location: DEST });
  res.end();
}
