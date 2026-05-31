// ═══════════════════════════════════════════════════════════════════
// LINEAR TV — Shared Player Engine
// ═══════════════════════════════════════════════════════════════════
// CONFIG — edit these two lines:
const CHANNEL_EPOCH    = new Date('2024-01-01T00:00:00Z').getTime();
const PLAYLIST_URL     = './playlist.json';
// ═══════════════════════════════════════════════════════════════════

const RESYNC_THRESHOLD  = 3;      // seconds of drift before snap
const POLL_INTERVAL_MS  = 5000;   // how often to check playlist.json for changes (ms)
const WATCHDOG_MS       = 1000;   // sync watchdog tick

function initPlayer(cfg) {

  // ── DOM refs (all optional — embed page omits some) ──────────────
  const vid          = document.getElementById(cfg.videoId);
  const loader       = document.getElementById(cfg.loaderId);
  const errorMsg     = document.getElementById(cfg.errorId);
  const btnPlay      = document.getElementById(cfg.btnPlayId);
  const volSlider    = document.getElementById(cfg.volSliderId);
  const progressFill = document.getElementById(cfg.progressFillId);
  const scheduleList = cfg.scheduleListId ? document.getElementById(cfg.scheduleListId) : null;
  const syncToast    = document.getElementById(cfg.syncToastId);
  const updateToast  = cfg.updateToastId ? document.getElementById(cfg.updateToastId) : null;
  const statusText   = cfg.statusTextId  ? document.getElementById(cfg.statusTextId)  : null;
  const statusOffset = cfg.statusOffsetId? document.getElementById(cfg.statusOffsetId): null;
  const nowTitle     = document.getElementById(cfg.nowTitleId);

  // ── State ─────────────────────────────────────────────────────────
  let playlist     = [];
  let totalDur     = 0;
  let currentIndex = -1;
  let hls          = null;
  let paused       = false;
  let lastPlaylistHash = '';

  // ── Clock (full-page only) ────────────────────────────────────────
  if (cfg.showClock && cfg.clockId) {
    function updateClock() {
      const now = new Date();
      document.getElementById(cfg.clockId).textContent =
        now.toLocaleTimeString('en-GB', { hour12: false });
      document.getElementById(cfg.clockDateId).textContent =
        now.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' }).toUpperCase();
    }
    updateClock();
    setInterval(updateClock, 1000);
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function fmt(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }
  function pad(n) { return String(n).padStart(2,'0'); }
  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function computePos(nowMs) {
    if (!playlist.length) return null;
    const elapsed = ((nowMs - CHANNEL_EPOCH) / 1000 % totalDur + totalDur) % totalDur;
    let acc = 0;
    for (let i = 0; i < playlist.length; i++) {
      if (elapsed < acc + playlist[i].duration)
        return { index: i, offset: elapsed - acc, globalOffset: elapsed };
      acc += playlist[i].duration;
    }
    return { index: 0, offset: 0, globalOffset: 0 };
  }

  // ── Toasts ────────────────────────────────────────────────────────
  let syncTimer, updateTimer;
  function showSyncToast() {
    if (!syncToast) return;
    syncToast.classList.add('show');
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncToast.classList.remove('show'), 2500);
  }
  function showUpdateToast() {
    if (!updateToast) return;
    updateToast.classList.add('show');
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => updateToast.classList.remove('show'), 3000);
  }

  // ── Schedule render ───────────────────────────────────────────────
  function renderSchedule(activeIdx, globalOffset) {
    if (!scheduleList) return;
    scheduleList.innerHTML = '';
    let acc = 0;
    playlist.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'schedule-item' +
        (i === activeIdx ? ' active' : acc + item.duration < globalOffset ? ' past' : '');
      el.innerHTML = `
        <div class="s-time">${fmt(acc)}</div>
        <div class="s-title">${esc(item.title)}</div>
        <div class="s-duration">${fmt(item.duration)} runtime</div>
        ${i === activeIdx ? '<div class="s-active-tag">▶ On now</div>' : ''}`;
      scheduleList.appendChild(el);
      if (i === activeIdx)
        setTimeout(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 100);
      acc += item.duration;
    });
  }

  // ── Video loading ─────────────────────────────────────────────────
  function loadVideo(index, seekTo) {
    const item = playlist[index];
    currentIndex = index;
    if (nowTitle) nowTitle.textContent = item.title;
    loader.classList.remove('hidden');
    errorMsg.classList.remove('show');

    if (hls) { hls.destroy(); hls = null; }

    const isHLS = item.type === 'hls' || item.url.includes('.m3u8');

    const onReady = () => {
      vid.currentTime = seekTo;
      doPlay();
    };

    if (isHLS && typeof Hls !== 'undefined' && Hls.isSupported()) {
      hls = new Hls({ startPosition: seekTo });
      hls.loadSource(item.url);
      hls.attachMedia(vid);
      hls.on(Hls.Events.MANIFEST_PARSED, onReady);
      hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) handleError(); });
    } else if (vid.canPlayType('application/vnd.apple.mpegurl') && isHLS) {
      vid.src = item.url;
      vid.addEventListener('loadedmetadata', onReady, { once: true });
    } else {
      vid.src = item.url;
      vid.addEventListener('loadedmetadata', onReady, { once: true });
    }

    vid.onerror = handleError;
  }

  function doPlay() {
    loader.classList.add('hidden');
    errorMsg.classList.remove('show');
    vid.volume = parseFloat(volSlider.value);
    vid.play().catch(() => { if (btnPlay) btnPlay.textContent = '▶'; });
    paused = false;
    if (btnPlay) btnPlay.textContent = '⏸';
  }

  function handleError() {
    loader.classList.add('hidden');
    errorMsg.classList.add('show');
    setTimeout(() => {
      const pos = computePos(Date.now());
      if (pos) loadVideo(pos.index, pos.offset);
    }, 5000);
  }

  // ── Play / Pause button ───────────────────────────────────────────
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      if (vid.paused) {
        const pos = computePos(Date.now());
        if (!pos) return;
        if (pos.index !== currentIndex) {
          loadVideo(pos.index, pos.offset);
        } else {
          vid.currentTime = pos.offset;
          vid.play();
        }
        paused = false;
        btnPlay.textContent = '⏸';
        showSyncToast();
      } else {
        vid.pause();
        paused = true;
        btnPlay.textContent = '▶';
      }
    });
  }

  if (volSlider) {
    volSlider.addEventListener('input', () => { vid.volume = parseFloat(volSlider.value); });
  }

  vid.addEventListener('contextmenu', e => e.preventDefault());

  // ── Sync watchdog ─────────────────────────────────────────────────
  setInterval(() => {
    if (paused || !playlist.length || vid.paused) return;
    const pos = computePos(Date.now());
    if (!pos) return;

    // Progress bar
    if (progressFill) {
      progressFill.style.width =
        Math.min((vid.currentTime / playlist[pos.index].duration) * 100, 100) + '%';
    }

    // Status bar
    if (statusText) {
      const rem = playlist[pos.index].duration - vid.currentTime;
      statusText.textContent = `Up next in ${fmt(Math.max(0, rem))}`;
    }
    if (statusOffset) {
      statusOffset.textContent = `OFFSET ${fmt(Math.floor(pos.globalOffset))}`;
    }

    // Video switch
    if (pos.index !== currentIndex) {
      loadVideo(pos.index, pos.offset);
      renderSchedule(pos.index, pos.globalOffset);
      return;
    }

    // Drift correction
    const drift = Math.abs(vid.currentTime - pos.offset);
    if (drift > RESYNC_THRESHOLD && !vid.seeking) {
      vid.currentTime = pos.offset;
      showSyncToast();
    }

    renderSchedule(pos.index, pos.globalOffset);
  }, WATCHDOG_MS);

  // ── Live playlist polling ─────────────────────────────────────────
  // Fetches playlist.json every POLL_INTERVAL_MS.
  // Uses cache-busting + ETag/hash comparison so the video only
  // restarts if the content genuinely changed.
  async function pollPlaylist() {
    try {
      const res = await fetch(PLAYLIST_URL + '?_=' + Date.now(), {
        cache: 'no-store'
      });
      if (!res.ok) return;

      const text = await res.text();

      // Fast hash: compare raw JSON string
      if (text === lastPlaylistHash) return; // no change
      lastPlaylistHash = text;

      let newList;
      try { newList = JSON.parse(text); } catch { return; }
      if (!Array.isArray(newList) || newList.length === 0) return;

      const newTotalDur = newList.reduce((s, v) => s + v.duration, 0);

      // Compute where we SHOULD be in the new playlist right now
      playlist = newList;
      totalDur = newTotalDur;

      const pos = computePos(Date.now());
      if (!pos) return;

      showUpdateToast();

      // If the currently playing video is still the same URL → just
      // update schedule and let playback continue (no interruption).
      const sameVideo = pos.index === currentIndex &&
        playlist[pos.index] &&
        vid.src &&
        (vid.src === playlist[pos.index].url ||
          vid.currentSrc === playlist[pos.index].url ||
          (hls && hls.url === playlist[pos.index].url));

      if (sameVideo) {
        renderSchedule(pos.index, pos.globalOffset);
      } else {
        // Different video now — switch immediately, seek to live position
        loadVideo(pos.index, pos.offset);
        renderSchedule(pos.index, pos.globalOffset);
      }

    } catch { /* network blip — try again next tick */ }
  }

  // ── Init ──────────────────────────────────────────────────────────
  async function init() {
    try {
      const res = await fetch(PLAYLIST_URL + '?_=' + Date.now(), { cache: 'no-store' });
      const text = await res.text();
      lastPlaylistHash = text;
      playlist = JSON.parse(text);
      totalDur = playlist.reduce((s, v) => s + v.duration, 0);

      const pos = computePos(Date.now());
      if (!pos) throw new Error('Empty playlist');

      renderSchedule(pos.index, pos.globalOffset);
      loadVideo(pos.index, pos.offset);

      // Start live polling after initial load
      setInterval(pollPlaylist, POLL_INTERVAL_MS);

    } catch (e) {
      loader.classList.add('hidden');
      errorMsg.classList.add('show');
      console.error('Channel init failed:', e);
    }
  }

  init();
}
