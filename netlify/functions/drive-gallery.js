/**
 * Galeria de fotos servida direto do Google Drive da igreja.
 *
 * A equipe só precisa soltar as fotos numa pasta compartilhada do Drive
 * ("qualquer pessoa com o link pode ver") — este endpoint lista os arquivos
 * de imagem e devolve URLs de miniatura/ampliação prontas para o site.
 *
 * Configuração: Netlify → Site configuration → Environment variables
 *   GOOGLE_API_KEY  = chave de API (console.cloud.google.com → APIs e serviços
 *                     → Credenciais → Criar chave de API; ative "Google Drive API")
 *   DRIVE_FOLDER_ID = o trecho após /folders/ na URL da pasta compartilhada
 *
 * Endpoint: GET /.netlify/functions/drive-gallery
 * Resposta: { fotos: [{ id, nome, thumb, full }] } (mais recentes primeiro)
 * Cache CDN: 10 min (s-maxage=600) + stale-while-revalidate de 24h
 */
exports.handler = async function (event) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { Allow: "GET", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Método não permitido." }),
    };
  }

  const apiKey   = process.env.GOOGLE_API_KEY;
  const folderId = process.env.DRIVE_FOLDER_ID;

  if (!apiKey || !folderId) {
    // 501: o frontend interpreta como "galeria ainda não configurada"
    return {
      statusCode: 501,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "GOOGLE_API_KEY/DRIVE_FOLDER_ID não configurados." }),
    };
  }

  const query = encodeURIComponent(
    `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
  );
  const url =
    `https://www.googleapis.com/drive/v3/files?q=${query}` +
    `&orderBy=createdTime desc&pageSize=100&fields=files(id,name,createdTime)&key=${apiKey}`;

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Google Drive respondeu HTTP ${response.status}`);
    }
    const data  = await response.json();
    const fotos = (data.files || []).map((f) => ({
      id:    f.id,
      nome:  f.name,
      // O endpoint /thumbnail funciona para arquivos públicos e redimensiona no servidor
      thumb: `https://drive.google.com/thumbnail?id=${f.id}&sz=w480`,
      full:  `https://drive.google.com/thumbnail?id=${f.id}&sz=w1600`,
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=600, max-age=600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ fotos }),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
