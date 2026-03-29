/**
 * Dynamic OGP for shared posts.
 * Bots get meta tags, real users get redirected to SPA.
 */

type Env = {
  DB: D1Database;
};

const BOT_UA = /bot|crawler|spider|preview|embed|slack|discord|telegram|whatsapp|facebook|twitter|line|kakaotalk/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SITE_URL = "https://ear-sky.llll-ll.com";
const SITE_NAME = "Ear in the Sky Diamond — イヤスカ";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const id = context.params.id as string;
  if (!id || !UUID_RE.test(id)) {
    return Response.redirect(`${SITE_URL}/`, 302);
  }

  const ua = context.request.headers.get("user-agent") || "";
  const isBot = BOT_UA.test(ua);

  // Always redirect real users
  if (!isBot) {
    return Response.redirect(`${SITE_URL}/#post-${id}`, 302);
  }

  // Fetch post from D1
  const row = await context.env.DB.prepare(
    "SELECT misheard_text, artist_name, song_title, original_text FROM posts WHERE id = ?"
  ).bind(id).first();

  if (!row) {
    return Response.redirect(`${SITE_URL}/`, 302);
  }

  const misheard = escapeHtml(row.misheard_text as string);
  const artist = escapeHtml(row.artist_name as string);
  const song = escapeHtml(row.song_title as string);
  const original = row.original_text ? escapeHtml(row.original_text as string) : "";

  const title = `「${misheard}」— ${artist}`;
  const description = original
    ? `${song} の空耳: "${misheard}" (${original})`
    : `${song} の空耳: "${misheard}"`;

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <title>${title} | ${SITE_NAME}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${SITE_URL}/share/${escapeHtml(id)}" />
  <meta property="og:image" content="${SITE_URL}/ogp.png?v=2" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:locale" content="ja_JP" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${SITE_URL}/ogp.png?v=2" />
  <meta http-equiv="refresh" content="0;url=${SITE_URL}/#post-${escapeHtml(id)}" />
</head>
<body>
  <p>リダイレクト中... <a href="${SITE_URL}/#post-${escapeHtml(id)}">こちら</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
