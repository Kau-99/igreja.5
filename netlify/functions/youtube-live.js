/**
 * Detecta se o canal da ADVIC está transmitindo ao vivo AGORA.
 *
 * Consulta a página /live do canal e procura o marcador "isLiveNow":true no
 * HTML (não há endpoint público sem chave de API para isso). Se o YouTube
 * mudar o formato da página, o frontend simplesmente volta ao fallback por
 * janela de horário — nada quebra.
 *
 * Usa YOUTUBE_CHANNEL_ID (mesma variável do youtube-feed) quando disponível;
 * sem ela, cai no handle público @advicof.
 *
 * Endpoint: GET /.netlify/functions/youtube-live
 * Resposta: { live: boolean, url: string|null }
 * Cache CDN: 2 min (s-maxage=120) — ao vivo precisa de resposta fresca
 */
exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { Allow: "GET", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Método não permitido." }),
    };
  }

  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const liveUrl = channelId
    ? `https://www.youtube.com/channel/${channelId}/live`
    : "https://www.youtube.com/@advicof/live";

  try {
    const response = await fetch(liveUrl, {
      headers: {
        Accept: "text/html",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "User-Agent": "Mozilla/5.0 ADVIC-Site/1.0 (+https://igrejaadvic.netlify.app)",
      },
    });
    if (!response.ok) {
      throw new Error(`YouTube respondeu HTTP ${response.status}`);
    }

    const html   = await response.text();
    const isLive = html.includes('"isLiveNow":true');

    let url = null;
    if (isLive) {
      // Quando ao vivo, a página /live canoniza para o watch?v= da transmissão
      const match = html.match(
        /<link rel="canonical" href="(https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11})"/,
      );
      url = match ? match[1] : liveUrl;
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=120, max-age=60, stale-while-revalidate=300",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ live: isLive, url }),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ live: false, error: error.message }),
    };
  }
};
