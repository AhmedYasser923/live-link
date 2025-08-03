self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Installed");
  event.waitUntil(
    caches.open("static-v1").then((cache) => {
      return cache.addAll([
        "/",
        "/chats",
        "/css/index.css", // adjust as needed
        "/js/main.js", // adjust as needed
        "/manifest.json",
        "/img/icon/chat.png",
        "/img/icon/chat.png",
        
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
