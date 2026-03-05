export default async (request, context) => {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Error: No URL provided.", { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "Referer": "https://tulnit.com",
        "User-Agent": "Mozilla/5.0"
      }
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("mpegurl") || targetUrl.endsWith(".m3u8")) {
      let text = await response.text();
      const proxyBase = `${url.origin}/live-stream?url=`;
      // This rewrites the internal links
      const rewrittenText = text.replace(/(https?:\/\/[^\s]+)/g, (match) => `${proxyBase}${encodeURIComponent(match)}`);

      return new Response(rewrittenText, {
        headers: { 
          "Content-Type": "application/vnd.apple.mpegurl", 
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }

    return new Response(response.body, {
      headers: { 
        "Content-Type": contentType, 
        "Access-Control-Allow-Origin": "*" 
      }
    });
  } catch (e) {
    return new Response("Proxy Error: " + e.message, { status: 500 });
  }
};
