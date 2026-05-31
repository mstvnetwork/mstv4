# 📺 Linear TV Channel — Free 24/7 Broadcast

A fully synchronized, 24/7 linear TV channel. All viewers see the same show at the same timestamp, regardless of when they join. No server required. 100% free forever.

---

## Files

```
index.html       ← The player (deploy this)
playlist.json    ← Your channel schedule
README.md        ← This file
```

---

## Deploy in 5 minutes (GitHub + Cloudflare Pages)

### Step 1 — Push to GitHub

1. Create a new **public** GitHub repository
2. Upload `index.html` and `playlist.json` to the root
3. Commit and push

### Step 2 — Deploy on Cloudflare Pages (free)

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com) → Sign up free
2. Click **Create a project** → **Connect to Git**
3. Select your GitHub repo
4. Build settings:
   - **Framework preset**: None
   - **Build command**: *(leave empty)*
   - **Build output directory**: `/` (root)
5. Click **Save and Deploy**

Your public URL will be: `https://your-channel.pages.dev`

Embed anywhere with:
```html
<iframe src="https://your-channel.pages.dev" width="960" height="540" allowfullscreen></iframe>
```

---

## Editing your playlist

Open `playlist.json` and add your videos:

```json
[
  {
    "title": "My Show Episode 1",
    "duration": 1800,
    "url": "https://example.com/ep1.m3u8",
    "type": "hls"
  },
  {
    "title": "My Show Episode 2",
    "duration": 1800,
    "url": "https://example.com/ep2.mp4",
    "type": "mp4"
  }
]
```

| Field | Description |
|-------|-------------|
| `title` | Show name displayed in the player |
| `duration` | Length in **seconds** (e.g. 1800 = 30 min) |
| `url` | Your .m3u8 or .mp4 URL |
| `type` | "hls" for .m3u8 streams, "mp4" for direct video |

After editing, push to GitHub — Cloudflare redeploys in ~30 seconds.

---

## How the sync works (no server needed)

```
elapsed = (Date.now() - CHANNEL_EPOCH) / 1000 % totalPlaylistDuration
```

Every viewer's browser computes the same number from the same UTC clock. The playlist loops infinitely. When someone pauses and resumes, the player snaps them back to the live position.

Change the epoch in index.html:
```js
const CHANNEL_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();
```

---

## Why free tiers won't run out

| Service | Serves | Your usage |
|---------|--------|------------|
| GitHub | playlist.json (~1 KB) | Near zero |
| Cloudflare Pages | index.html (~15 KB) | Near zero |
| Your 3rd-party CDN | All video bytes | Stays at source |

Cloudflare Pages never proxies video. All bandwidth is consumed at your external source.

---

## Tips

- Video URLs must be HTTPS and allow CORS (`Access-Control-Allow-Origin: *`)
- Get exact duration with: `ffprobe -v quiet -show_entries format=duration -of csv=p=0 video.mp4`
- The playlist loops automatically and infinitely
