/* After a redeploy, a stale tab can request chunk hashes that no longer exist
   (ChunkLoadError -> 404). This runs before Next's runtime, so it catches the
   failure even when the page chunk itself is missing, then reloads once to pull
   fresh HTML + chunks. The 10s throttle prevents a reload loop if a chunk is
   genuinely gone.

   Served as a static file rather than an inline <script> so it satisfies the
   Content-Security-Policy's script-src 'self' without needing a nonce (which
   would force the root layout to read headers() and make every page dynamic). */
(function () {
  var K = '__chunk_reload_at';

  function isChunk(m) {
    return (
      typeof m === 'string' &&
      /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module/i.test(m)
    );
  }

  function recover() {
    if (/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)) return;
    try {
      var last = +(sessionStorage.getItem(K) || 0);
      if (Date.now() - last < 10000) return;
      sessionStorage.setItem(K, '' + Date.now());
    } catch (e) {}
    location.reload();
  }

  addEventListener('error', function (e) {
    if (isChunk(e && e.message) || (e && e.error && isChunk(e.error.name))) recover();
  });

  addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    if (r && (isChunk(r.name) || isChunk(r.message))) recover();
  });
})();
