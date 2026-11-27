/* Kipita service worker.
   One job: when a page cannot be reached because the phone is offline, show /offline.html instead
   of the browser's error page. It stores nothing else, so a signed-in page is never served from a
   stored copy and a new deploy is never hidden behind an old one.
   To change the offline page, change CACHE so phones fetch the new copy. */
const CACHE = "kipita-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE).then((page) => page || Response.error())),
  );
});
