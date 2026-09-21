/**
 * Loads the stale-chunk recovery script (see public/chunk-reload.js).
 *
 * It is a static file rather than an inline script so the CSP's
 * `script-src 'self'` covers it. Rendered without defer/async so it installs
 * its error listeners before Next's runtime starts requesting chunks.
 */
export function ChunkReloadScript() {
  return <script src="/chunk-reload.js" />;
}
