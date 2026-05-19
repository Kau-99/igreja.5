/**
 * Proxy serverless para o feed RSS público do YouTube.
 *
 * Faço o fetch no servidor por dois motivos: o YouTube não serve CORS para browsers,
 * e assim o Channel ID fica somente em variável de ambiente — fora do bundle frontend.
 *
 * Configuração: Netlify → Site configuration → Environment variables
 *   YOUTUBE_CHANNEL_ID = UC... (22 caracteres após o prefixo "UC")
 *   Para encontrar: inspecione o código-fonte de youtube.com/@advicof e busque "channelId".
 *
 * Endpoint: GET /.netlify/functions/youtube-feed
 * Cache CDN: 30 min (s-maxage=1800) + stale-while-revalidate de 24h
 */
exports.handler = async function (event, context) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { Allow: "GET", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Método não permitido." }),
    };
  }

  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!channelId) {
    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "YOUTUBE_CHANNEL_ID não configurado." }),
    };
  }

  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

  try {
    const response = await fetch(feedUrl, {
      headers: {
        Accept: "application/xml, text/xml",
        "User-Agent": "Mozilla/5.0 ADVIC-Site/1.0 (+https://igrejaadvic.netlify.app)",
      },
    });

    if (!response.ok) {
      throw new Error(`YouTube respondeu HTTP ${response.status}`);
    }

    const xml = await response.text();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=1800, max-age=1800, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
      body: xml,
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
