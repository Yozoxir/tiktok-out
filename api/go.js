export const config = {
  runtime: "edge", // plus rapide sur Vercel
};

function withTimeout(promise, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { promise: promise(ctrl.signal).finally(() => clearTimeout(t)), ctrl };
}

export default async function handler(req) {
  const DEST = "https://antoressel.com";
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "home").toString();

  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;

  // Si KV pas dispo, on redirige quand même (fail-open = rapide)
  if (!redisUrl || !redisToken) {
    return Response.redirect(DEST, 302);
  }

  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const isTikTok =
    ua.includes("tiktok") ||
    ua.includes("bytedance") ||
    ua.includes("musical.ly") ||
    ua.includes("aweme") ||
    ua.includes("ttwebview");

  // Si tu veux : dans TikTok, ne pas rediriger (on laisse index.html gérer)
  // Ici /go est fait pour être ouvert dans navigateur, donc on redirect toujours.

  const key = `clicks:${slug}`;

  // 1) incrément KV (très rapide, mais on met un timeout)
  let count = null;
  try {
    const { promise } = withTimeout(
      (signal) =>
        fetch(`${redisUrl}/incr/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${redisToken}` },
          signal,
        }),
      800
    );

    const r = await promise;
    const j = await r.json();
    count = j?.result ?? null;
  } catch (_) {
    // on ignore, on ne bloque pas la redirection
  }

  // 2) webhook Discord en “best effort” (timeout court, sans bloquer)
  if (discordWebhook) {
    const payload = {
      embeds: [
        {
          title: "📈 Nouveau clic",
          description: `Slug : **${slug}**`,
          fields: [
            { name: "Total", value: count === null ? "?" : String(count), inline: true },
            { name: "TikTok WebView", value: isTikTok ? "Oui" : "Non", inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Fire-and-forget avec timeout
    try {
      const { promise } = withTimeout(
        (signal) =>
          fetch(discordWebhook, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
            signal,
          }),
        600
      );
      // Important: on ne await pas pour ne pas ralentir
      promise.catch(() => {});
    } catch (_) {}
  }

  // 3) redirect instant
  return Response.redirect(DEST, 302);
}
