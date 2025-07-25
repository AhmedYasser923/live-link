self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Installed");
  event.waitUntil(
    caches.open("static-v1").then((cache) => {
      return cache.addAll([
        "/",
        "/login",
        "/css/style.css", // adjust as needed
        "/js/main.js", // adjust as needed
        "/manifest.json",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
