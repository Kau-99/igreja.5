/**
 * Netlify Function — YouTube RSS Feed Proxy
 *
 * Busca o feed RSS público do canal no servidor, evitando problemas de CORS
 * e expondo o Channel ID apenas como variável de ambiente (não no código frontend).
 *
 * ⚠️  CONFIGURAÇÃO NECESSÁRIA:
 *   1. Acesse o painel da Netlify → Site configuration → Environment variables
 *   2. Adicione a variável:  YOUTUBE_CHANNEL_ID = <seu channel ID>
 *
 * Como encontrar o Channel ID:
 *   • Acesse youtube.com/@advicof no navegador
 *   • Abra o código-fonte (Ctrl+U) e pesquise por "channelId" ou "externalId"
 *   • O ID começa com "UC" seguido de 22 caracteres
 *
 * Endpoint: GET /.netlify/functions/youtube-feed
 * Cache:    30 minutos (s-maxage no CDN da Netlify)
 */
exports.handler = async function (event, context) {
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
      headers: { Accept: "application/xml, text/xml" },
    });

    if (!response.ok) {
      throw new Error(`YouTube respondeu HTTP ${response.status}`);
    }

    const xml = await response.text();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=1800, max-age=1800",
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
