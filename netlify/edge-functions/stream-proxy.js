export default async (request, context) => {
  const urlParams = new URL(request.url).searchParams;
  const targetUrl = urlParams.get("url");

  if (!targetUrl) {
    return new Response("Missing 'url' parameter", { status: 400 });
  }

  // Fetch from the 3rd party with your spoofed Referer
  const response = await fetch(targetUrl, {
    headers: {
      "Referer": "https://tulnit.com",
      "User-Agent": "Mozilla/5.0"
    }
  });

  const contentType = response.headers.get("content-type") || "";

  // If it's a playlist, we must rewrite its internal links to also use this proxy
  if (contentType.includes("mpegurl") || targetUrl.endsWith(".m3u8")) {
    let text = await response.text();
    const proxyBase = `${new URL(request.url).origin}/live-stream?url=`;
    
    // This finds any link inside the .m3u8 and prefixes it with your proxy URL
    const rewrittenText = text.replace(/(https?:\/\/[^\s]+)/g, `${proxyBase}$1`);

    return new Response(rewrittenText, {
      headers: { "Content-Type": "application/vnd.apple.mpegurl", "Access-Control-Allow-Origin": "*" }
    });
  }

  // If it's a video chunk (.ts), return raw data
  return new Response(response.body, {
    headers: { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" }
  });
};
