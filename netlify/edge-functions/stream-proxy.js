export default async (request, context) => {
  const url = new URL(request.url);
  // Default path if none is provided in the query string
  const targetPath = url.searchParams.get("path") || "mumt01/FASTMIX/tracks-v2a1/mono.m3u8";
  const targetUrl = `https://fucking-tv-ott.keralive.workers.dev{targetPath}`;

  const response = await fetch(targetUrl, {
    headers: {
      "Referer": "https://tulnit.com",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
  });

  const contentType = response.headers.get("content-type") || "";

  // If it's the playlist file, rewrite its content to proxy the video segments too
  if (contentType.includes("mpegurl") || targetPath.endsWith(".m3u8")) {
    let text = await response.text();
    const proxyBase = `${url.origin}/live-stream?path=`;
    
    // This regex catches absolute URLs and prefixes them with your proxy URL
    const rewrittenText = text.replace(/(https:\/\/fucking-tv-ott\.keralive\.workers\.dev\/)(.*)/g, `${proxyBase}$2`);

    return new Response(rewrittenText, {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // Otherwise, it's a video segment (.ts), return the raw binary data
  return new Response(response.body, {
    headers: {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*"
    }
  });
};
